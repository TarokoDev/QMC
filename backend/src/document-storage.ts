/**
 * Thin wrapper over the Supabase Storage REST API for the `quote-documents`
 * bucket, using the service-role key.
 *
 * Shaped exactly like supabase-admin.ts: `fetch` only (no new dependency), the
 * key read in one module, and a dedicated error type so routes can answer 503
 * with something actionable instead of a bare 500.
 *
 * Why the server holds the key at all when browsers upload directly: signing
 * and deleting must work for objects the *requester* cannot read under storage
 * RLS — the admin drill-down reads another user's documents, and the cascade
 * cleanup runs for objects whose owner is not the caller. One code path for
 * all of it is simpler than two half-trusted ones.
 */

export const DOCUMENTS_BUCKET = 'quote-documents'

/** Thrown when the service-role key is absent, so routes can answer 503. */
export class SupabaseStorageUnavailableError extends Error {}

interface StorageEnv {
  url: string
  key: string
}

function storageEnv(): StorageEnv {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new SupabaseStorageUnavailableError(
      'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — document storage is unavailable. See backend/.env.example.',
    )
  }
  return { url, key }
}

async function storageFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { url, key } = storageEnv()
  return fetch(`${url}/storage/v1${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
}

/**
 * A short-lived URL that downloads one object under its original filename.
 *
 * 60 seconds because the link is followed immediately — a URL that leaks into
 * a chat log expires before it is useful. `download=` both restores the name
 * (keys are uuids) and forces `Content-Disposition: attachment`, so an
 * uploaded HTML or SVG file can never execute on the storage origin.
 */
export async function createSignedDownloadUrl(
  storagePath: string,
  fileName: string,
  expiresIn = 60,
): Promise<string> {
  const res = await storageFetch(`/object/sign/${DOCUMENTS_BUCKET}/${encodeStoragePath(storagePath)}`, {
    method: 'POST',
    body: JSON.stringify({ expiresIn }),
  })
  if (!res.ok) {
    throw new Error(`Supabase Storage sign failed: ${res.status}`)
  }

  const body = (await res.json()) as { signedURL?: string }
  if (!body.signedURL) throw new Error('Supabase Storage sign returned no signedURL')

  const { url } = storageEnv()
  const separator = body.signedURL.includes('?') ? '&' : '?'
  return `${url}/storage/v1${body.signedURL}${separator}download=${encodeURIComponent(fileName)}`
}

/**
 * Real size and content type of an uploaded object, or `null` when it is not
 * there. Used to confirm a direct browser upload actually landed, and that the
 * browser was not lying about the size it declared.
 */
export async function statObject(
  storagePath: string,
): Promise<{ size: number; contentType: string } | null> {
  const slash = storagePath.lastIndexOf('/')
  const prefix = slash === -1 ? '' : storagePath.slice(0, slash)
  const name = slash === -1 ? storagePath : storagePath.slice(slash + 1)

  const res = await storageFetch(`/object/list/${DOCUMENTS_BUCKET}`, {
    method: 'POST',
    body: JSON.stringify({ prefix, search: name, limit: 1 }),
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Supabase Storage list failed: ${res.status}`)

  const rows = (await res.json()) as
    | { name: string; metadata?: { size?: number; mimetype?: string } | null }[]
    | null
  const match = rows?.find((row) => row.name === name)
  if (!match?.metadata) return null

  return {
    size: match.metadata.size ?? 0,
    contentType: match.metadata.mimetype ?? 'application/octet-stream',
  }
}

/** Deletes objects by exact key. Missing keys are not an error. */
export async function removeObjects(storagePaths: string[]): Promise<void> {
  if (storagePaths.length === 0) return

  // The delete endpoint takes a list per call; chunked so a folder with
  // hundreds of attachments does not build one enormous request body.
  for (let start = 0; start < storagePaths.length; start += 100) {
    const chunk = storagePaths.slice(start, start + 100)
    const res = await storageFetch(`/object/${DOCUMENTS_BUCKET}`, {
      method: 'DELETE',
      body: JSON.stringify({ prefixes: chunk }),
    })
    if (!res.ok && res.status !== 404) {
      throw new Error(`Supabase Storage delete failed: ${res.status}`)
    }
  }
}

/** Percent-encodes each segment; the separators must stay separators. */
function encodeStoragePath(storagePath: string): string {
  return storagePath.split('/').map(encodeURIComponent).join('/')
}
