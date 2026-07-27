/**
 * Turns a picked image file into a base64 data URI small enough to store on
 * the company settings row. The bytes go into Postgres and ride along on every
 * `/api/settings` response, so a 4 MB phone photo has to come down to size
 * before it is ever sent.
 *
 * Keep `MAX_LOGO_BYTES` and the accepted types in step with
 * `backend/src/company-logo.ts` — the server enforces the same bounds.
 */

export const MAX_LOGO_BYTES = 300 * 1024

export const LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export const LOGO_FILE_ACCEPT = LOGO_MIME_TYPES.join(',')

/// Roughly the printed header cell at 2x, so the logo stays crisp on paper
/// without carrying pixels no output will ever use.
const MAX_WIDTH = 600
const MAX_HEIGHT = 300

export class UnsupportedImageError extends Error {
  constructor() {
    super('Please choose a PNG, JPEG or WebP image.')
  }
}

export class ImageTooLargeError extends Error {
  constructor() {
    super('That image is too detailed to store — try a smaller or simpler logo.')
  }
}

/** Bytes a data URI's base64 payload decodes to, without decoding it. */
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return (base64.length / 4) * 3 - padding
}

function scaleToFit(width: number, height: number, maxWidth: number, maxHeight: number) {
  // Never upscale: a 120px logo blown up to 600px is blurrier, not better.
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1)
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) }
}

function encode(bitmap: ImageBitmap, maxWidth: number, maxHeight: number, type: string, quality?: number): string {
  const { width, height } = scaleToFit(bitmap.width, bitmap.height, maxWidth, maxHeight)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new UnsupportedImageError()
  ctx.drawImage(bitmap, 0, 0, width, height)

  return canvas.toDataURL(type, quality)
}

/**
 * Decodes, downscales and re-encodes `file`, falling back through
 * progressively cheaper encodings until the result fits the byte cap.
 */
export async function fileToLogoDataUrl(file: File): Promise<string> {
  if (!LOGO_MIME_TYPES.includes(file.type)) throw new UnsupportedImageError()

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new UnsupportedImageError()
  }

  try {
    // PNG first so a logo with a transparent background keeps it; WebP also
    // supports transparency and is far denser for photographic sources.
    const attempts: [string, number | undefined, number, number][] = [
      ['image/png', undefined, MAX_WIDTH, MAX_HEIGHT],
      ['image/webp', 0.85, MAX_WIDTH, MAX_HEIGHT],
      ['image/webp', 0.8, MAX_WIDTH / 2, MAX_HEIGHT / 2],
    ]

    for (const [type, quality, maxWidth, maxHeight] of attempts) {
      // A browser that cannot encode the requested type silently hands back a
      // PNG, so the later attempts still help by shrinking the dimensions.
      const dataUrl = encode(bitmap, maxWidth, maxHeight, type, quality)
      if (dataUrlBytes(dataUrl) <= MAX_LOGO_BYTES) return dataUrl
    }

    throw new ImageTooLargeError()
  } finally {
    bitmap.close()
  }
}
