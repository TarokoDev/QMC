/**
 * The company logo is stored inline on `company_settings` as a base64 data
 * URI rather than in Supabase Storage. It is one small image for the whole
 * deployment, and it has to be present the instant `window.print()` runs — a
 * remote `<img>` that has not finished loading prints as a blank box.
 */

export const MAX_LOGO_BYTES = 300 * 1024

/// No `image/svg+xml`: an SVG is markup, and this value is echoed straight back
/// into every user's page and printed document.
export const LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

export type LogoMimeType = (typeof LOGO_MIME_TYPES)[number]

const LOGO_DATA_URL_RE = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]*={0,2})$/

/** Bytes a base64 payload decodes to, without decoding it. */
export function decodedByteLength(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return (base64.length / 4) * 3 - padding
}

export interface ParsedLogo {
  mimeType: LogoMimeType
  byteLength: number
}

/** Returns null for anything that is not a well-formed, in-budget logo data URI. */
export function parseLogoDataUrl(value: string): ParsedLogo | null {
  const match = LOGO_DATA_URL_RE.exec(value)
  if (!match) return null

  const [, subtype, base64] = match
  // A base64 body is always a whole number of 4-char groups; without this the
  // byte-length maths below is a fraction and the size check goes soft.
  if (base64.length === 0 || base64.length % 4 !== 0) return null

  const byteLength = decodedByteLength(base64)
  if (byteLength <= 0 || byteLength > MAX_LOGO_BYTES) return null

  return { mimeType: `image/${subtype}` as LogoMimeType, byteLength }
}
