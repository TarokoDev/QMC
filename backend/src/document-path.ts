/**
 * Storage key construction for revision documents.
 *
 * Two rules drive everything here:
 *
 * 1. The first path segment is the owner's Supabase auth UID, because the
 *    storage RLS policy compares exactly that segment to `auth.uid()`. Storage
 *    policies run in Supabase's own schema, so scoping any other way would mean
 *    joining our application tables from a policy on every object operation.
 * 2. The user's filename never appears in the key. Keys are `{uuid}.{ext}`, so
 *    there is no spacing, unicode, casing or `../` behaviour to get right — the
 *    filename is display metadata, stored in the row.
 */

/** Supabase's default per-file limit; the bucket is configured to match. */
export const MAX_DOCUMENT_BYTES = 52_428_800

// Built from a string so the escapes stay visible in source rather than
// becoming literal control characters in this file.
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001f\\u007f]', 'g')

/**
 * Cleans a filename for display. Control characters go, path separators and
 * runs of whitespace collapse to a single space, and the result is capped at
 * 200 characters with the extension preserved (truncating "plans.skp" to
 * "plans" would leave a file nobody can identify).
 */
export function sanitizeFileName(raw: string): string {
  const cleaned = raw
    .replace(CONTROL_CHARS, '')
    .replace(/[/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+/, '')
    .trim()

  if (cleaned === '') return 'file'
  if (cleaned.length <= 200) return cleaned

  const ext = extensionOf(cleaned)
  const suffix = ext === '' ? '' : `.${ext}`
  return cleaned.slice(0, 200 - suffix.length).trimEnd() + suffix
}

/**
 * Lowercased extension of a filename, or `''` when there is nothing usable.
 * Anything outside `[a-z0-9]` is dropped rather than escaped: the key does not
 * need to be reversible, and the real name lives in the row.
 */
export function extensionOf(fileName: string): string {
  const match = /\.([A-Za-z0-9]{1,10})$/.exec(fileName)
  return match ? match[1].toLowerCase() : ''
}

/** `{ownerId}/{revisionId}/{documentId}.{ext}` — see the module comment. */
export function buildStoragePath(
  ownerId: string,
  revisionId: string,
  documentId: string,
  fileName: string,
): string {
  const ext = extensionOf(fileName)
  return `${ownerId}/${revisionId}/${documentId}${ext === '' ? '' : `.${ext}`}`
}
