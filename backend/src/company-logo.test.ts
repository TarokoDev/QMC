import { describe, expect, it } from 'vitest'
import { MAX_LOGO_BYTES, decodedByteLength, parseLogoDataUrl } from './company-logo.js'
import { companyLogoBodySchema } from './schemas.js'

function dataUrl(mime: string, bytes: number): string {
  return `data:${mime};base64,${Buffer.alloc(bytes, 1).toString('base64')}`
}

describe('decodedByteLength', () => {
  it('counts padding out', () => {
    expect(decodedByteLength(Buffer.alloc(1).toString('base64'))).toBe(1)
    expect(decodedByteLength(Buffer.alloc(2).toString('base64'))).toBe(2)
    expect(decodedByteLength(Buffer.alloc(3).toString('base64'))).toBe(3)
  })
})

describe('parseLogoDataUrl', () => {
  it('accepts the supported image types', () => {
    for (const mime of ['image/png', 'image/jpeg', 'image/webp']) {
      expect(parseLogoDataUrl(dataUrl(mime, 64))).toEqual({ mimeType: mime, byteLength: 64 })
    }
  })

  it('rejects SVG, which is markup echoed back into every page', () => {
    expect(parseLogoDataUrl(dataUrl('image/svg+xml', 64))).toBeNull()
  })

  it('rejects non-images and non-data URIs', () => {
    expect(parseLogoDataUrl(dataUrl('application/pdf', 64))).toBeNull()
    expect(parseLogoDataUrl('https://example.com/logo.png')).toBeNull()
  })

  it('rejects an empty or malformed base64 body', () => {
    expect(parseLogoDataUrl('data:image/png;base64,')).toBeNull()
    expect(parseLogoDataUrl('data:image/png;base64,AAA')).toBeNull()
    expect(parseLogoDataUrl('data:image/png;base64,<script>')).toBeNull()
  })

  it('enforces the byte cap', () => {
    expect(parseLogoDataUrl(dataUrl('image/png', MAX_LOGO_BYTES))).not.toBeNull()
    expect(parseLogoDataUrl(dataUrl('image/png', MAX_LOGO_BYTES + 1))).toBeNull()
  })
})

describe('companyLogoBodySchema', () => {
  it('passes a valid data URI through', () => {
    const value = dataUrl('image/png', 32)
    expect(companyLogoBodySchema.parse({ dataUrl: value })).toEqual({ dataUrl: value })
  })

  it('throws on an oversized image', () => {
    expect(() => companyLogoBodySchema.parse({ dataUrl: dataUrl('image/png', MAX_LOGO_BYTES + 4) })).toThrow()
  })
})
