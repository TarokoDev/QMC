import { api } from '@/lib/api-client'
import { getAccessToken } from '@/lib/supabase-client'

/**
 * Files attached to one revision — the signed quote PDF, SketchUp models, site
 * photos.
 *
 * Uploads do not go through our API. The API hands out a storage key, the
 * browser PUTs the bytes straight to Supabase Storage, and the API then
 * confirms the object landed. That keeps 50 MB files off the Node server
 * entirely, and is why the raw XHR below lives here instead of in
 * `api-client.ts`, which stays JSON-only.
 */

/** Supabase's default per-file limit; the bucket is configured to match. */
export const MAX_DOCUMENT_BYTES = 52_428_800

export interface RevisionDocument {
  id: string
  revisionId: string
  fileName: string
  contentType: string
  sizeBytes: number
  createdAt: string
}

interface UploadTicket {
  document: RevisionDocument
  bucket: string
  storagePath: string
}

interface DownloadUrl {
  url: string
  expiresIn: number
}

export class FileTooLargeError extends Error {
  fileName: string
  constructor(fileName: string) {
    super(`${fileName} is larger than the 50 MB limit`)
    this.fileName = fileName
  }
}

export function listDocuments(revisionId: string): Promise<RevisionDocument[]> {
  return api.get(`/api/revisions/${revisionId}/documents`)
}

export function deleteDocument(id: string): Promise<void> {
  return api.delete(`/api/documents/${id}`)
}

export async function getDownloadUrl(id: string): Promise<string> {
  const { url } = await api.post<DownloadUrl>(`/api/documents/${id}/download`)
  return url
}

/** Admin drill-down: read-only over another user's revisions. */
export function listUserDocuments(userId: string, revisionId: string): Promise<RevisionDocument[]> {
  return api.get(`/api/admin/users/${userId}/revisions/${revisionId}/documents`)
}

export async function getUserDownloadUrl(userId: string, id: string): Promise<string> {
  const { url } = await api.post<DownloadUrl>(`/api/admin/users/${userId}/documents/${id}/download`)
  return url
}

/**
 * Reserve a row, push the bytes, confirm the object.
 *
 * If either of the last two steps fails, the reserved row is deleted on the way
 * out — an abandoned upload should not leave a half-created document behind.
 * Should even that cleanup fail, the row stays `pending`, which the API hides
 * from listings and sweeps an hour later.
 */
export async function uploadDocument(
  revisionId: string,
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<RevisionDocument> {
  if (file.size > MAX_DOCUMENT_BYTES) throw new FileTooLargeError(file.name)

  const ticket = await api.post<UploadTicket>(`/api/revisions/${revisionId}/documents`, {
    fileName: file.name,
    contentType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
  })

  try {
    await putToStorage(ticket, file, onProgress)
    return await api.post<RevisionDocument>(`/api/documents/${ticket.document.id}/confirm`)
  } catch (error) {
    await deleteDocument(ticket.document.id).catch(() => {
      // Best effort: the API's stale-pending sweep is the backstop.
    })
    throw error
  }
}

/**
 * Direct PUT to Supabase Storage with upload progress.
 *
 * `fetch` cannot report request progress, and supabase-js's `upload()` gives no
 * progress event either, so this is XHR on purpose — a 50 MB file over site
 * wifi needs a bar, not a spinner.
 */
async function putToStorage(
  ticket: UploadTicket,
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!supabaseUrl || !anonKey) {
    throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — see frontend/.env.example')
  }

  const token = await getAccessToken()
  const url = `${supabaseUrl}/storage/v1/object/${ticket.bucket}/${ticket.storagePath}`

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.setRequestHeader('apikey', anonKey)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    // Keys are single-use uuids, so an overwrite would always be a bug.
    xhr.setRequestHeader('x-upsert', 'false')

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1)
        resolve()
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`))
      }
    }
    xhr.onerror = () => reject(new Error('Upload failed: the connection dropped'))
    xhr.onabort = () => reject(new Error('Upload cancelled'))

    xhr.send(file)
  })
}

/** "2.4 MB" — sizes are shown next to filenames, not in tables of numbers. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  // One decimal only while it carries information: "2.4 MB", but "48 MB".
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`
}
