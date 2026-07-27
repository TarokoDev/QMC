/**
 * Removes objects in the `quote-documents` bucket that no `revision_documents`
 * row points at.
 *
 *   npm run storage:gc              # report what would be deleted
 *   npm run storage:gc -- --delete  # actually delete it
 *
 * Why this exists: deleting a folder, category, client or revision cascades the
 * document rows away inside Postgres. The API collects the storage keys before
 * each of those deletes and removes the objects afterwards, but that step is
 * best-effort — it must never fail a user's delete — so a storage outage at the
 * wrong moment leaves objects nobody can reach. This is the sweep that reaps
 * them, and the check that says whether the leak is real.
 *
 * Dry run by default: deleting files is not something a script should do
 * because someone typed its name.
 */

import { prisma } from '../src/db.js'
import { DOCUMENTS_BUCKET, removeObjects } from '../src/document-storage.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PAGE_SIZE = 1000

interface StorageEntry {
  name: string
  id: string | null
}

/** Lists one folder level; Storage has no recursive listing. */
async function listFolder(prefix: string): Promise<StorageEntry[]> {
  const entries: StorageEntry[] = []

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${DOCUMENTS_BUCKET}`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY as string,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefix, limit: PAGE_SIZE, offset }),
    })
    if (!res.ok) throw new Error(`Storage list failed for "${prefix}": ${res.status}`)

    const page = (await res.json()) as StorageEntry[]
    entries.push(...page)
    if (page.length < PAGE_SIZE) break
  }

  return entries
}

/** Walks owner → revision → file. A null `id` marks a folder, not an object. */
async function listAllObjects(): Promise<string[]> {
  const keys: string[] = []

  for (const owner of await listFolder('')) {
    if (owner.id !== null) continue
    for (const revision of await listFolder(`${owner.name}/`)) {
      if (revision.id !== null) continue
      for (const file of await listFolder(`${owner.name}/${revision.name}/`)) {
        if (file.id === null) continue
        keys.push(`${owner.name}/${revision.name}/${file.name}`)
      }
    }
  }

  return keys
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are required. See backend/.env.example.')
    process.exit(1)
  }

  const shouldDelete = process.argv.includes('--delete')

  const objects = await listAllObjects()
  const known = new Set(
    (await prisma.revisionDocument.findMany({ select: { storagePath: true } })).map(
      (document) => document.storagePath,
    ),
  )
  const orphans = objects.filter((key) => !known.has(key))

  console.log(`${objects.length} object(s) in ${DOCUMENTS_BUCKET}, ${known.size} tracked, ${orphans.length} orphaned.`)
  for (const key of orphans) console.log(`  ${key}`)

  if (orphans.length === 0) return
  if (!shouldDelete) {
    console.log('\nDry run. Re-run with --delete to remove the objects listed above.')
    return
  }

  await removeObjects(orphans)
  console.log(`Deleted ${orphans.length} orphaned object(s).`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
