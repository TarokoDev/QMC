import type { Prisma } from '@prisma/client'
import { prisma } from './db.js'
import { removeObjects } from './document-storage.js'

/**
 * Keeping storage objects from outliving their rows.
 *
 * Deleting a folder, category, client or revision removes `revision_documents`
 * through `ON DELETE CASCADE` — inside Postgres, with no application code
 * running and no trigger to catch it. After the delete there is nothing left
 * to say which objects belonged to it, so every delete route has to ask first.
 */

/**
 * Storage keys of every document under the revisions matched by `where`.
 * Call this *before* the delete that cascades them away.
 */
export async function collectDocumentPaths(where: Prisma.RevisionWhereInput): Promise<string[]> {
  const documents = await prisma.revisionDocument.findMany({
    where: { revision: where },
    select: { storagePath: true },
  })
  return documents.map((document) => document.storagePath)
}

/**
 * Best-effort cleanup for a delete that has already committed. The rows are
 * gone and the user's request succeeded, so a storage outage must not turn
 * that into an error — it logs and moves on, and `scripts/storage-gc.ts` reaps
 * whatever gets missed.
 */
export function removeObjectsInBackground(storagePaths: string[]): void {
  if (storagePaths.length === 0) return
  removeObjects(storagePaths).catch((error) => {
    console.error(`Failed to remove ${storagePaths.length} storage object(s) after a delete:`, error)
  })
}
