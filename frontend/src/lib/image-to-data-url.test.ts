import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ImageTooLargeError,
  MAX_LOGO_BYTES,
  UnsupportedImageError,
  dataUrlBytes,
  fileToLogoDataUrl,
} from '@/lib/image-to-data-url'

/// Tests run in the `node` environment, so canvas and `createImageBitmap` are
/// stubbed rather than shimmed — what matters here is the scale/encode/fallback
/// decision chain, not the browser's pixel output.
interface EncodeCall {
  width: number
  height: number
  type: string
  quality?: number
}

function stubBrowser(bitmap: { width: number; height: number }, bytesFor: (call: EncodeCall) => number) {
  const calls: EncodeCall[] = []
  const close = vi.fn()

  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ ...bitmap, close })))
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage: vi.fn() }),
        toDataURL: (type: string, quality?: number) => {
          const call = { width: canvas.width, height: canvas.height, type, quality }
          calls.push(call)
          // 3 bytes per 4 base64 chars, no padding.
          const base64 = 'A'.repeat(Math.ceil(bytesFor(call) / 3) * 4)
          return `data:${type};base64,${base64}`
        },
      }
      return canvas
    },
  })

  return { calls, close }
}

function file(type: string): File {
  return { type } as File
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('dataUrlBytes', () => {
  it('accounts for padding', () => {
    expect(dataUrlBytes('data:image/png;base64,AAAA')).toBe(3)
    expect(dataUrlBytes('data:image/png;base64,AAA=')).toBe(2)
    expect(dataUrlBytes('data:image/png;base64,AA==')).toBe(1)
  })
})

describe('fileToLogoDataUrl', () => {
  it('rejects a type the server would reject anyway', async () => {
    await expect(fileToLogoDataUrl(file('image/svg+xml'))).rejects.toBeInstanceOf(UnsupportedImageError)
  })

  it('downscales to fit the 600x300 box, preserving aspect ratio', async () => {
    const { calls } = stubBrowser({ width: 4000, height: 1000 }, () => 1024)
    const result = await fileToLogoDataUrl(file('image/png'))

    expect(result.startsWith('data:image/png;base64,')).toBe(true)
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ width: 600, height: 150, type: 'image/png' })
  })

  it('never upscales a small logo', async () => {
    const { calls } = stubBrowser({ width: 120, height: 60 }, () => 1024)
    await fileToLogoDataUrl(file('image/png'))

    expect(calls[0]).toMatchObject({ width: 120, height: 60 })
  })

  it('falls back to WebP when the PNG is over the cap', async () => {
    const { calls } = stubBrowser({ width: 600, height: 300 }, (call) =>
      call.type === 'image/png' ? MAX_LOGO_BYTES + 1 : 1024,
    )
    const result = await fileToLogoDataUrl(file('image/jpeg'))

    expect(result.startsWith('data:image/webp;base64,')).toBe(true)
    expect(calls.map((c) => c.type)).toEqual(['image/png', 'image/webp'])
  })

  it('halves the dimensions before giving up', async () => {
    const { calls, close } = stubBrowser({ width: 600, height: 300 }, (call) =>
      call.width < 600 ? 1024 : MAX_LOGO_BYTES + 1,
    )
    await fileToLogoDataUrl(file('image/png'))

    expect(calls).toHaveLength(3)
    expect(calls[2]).toMatchObject({ width: 300, height: 150, type: 'image/webp' })
    expect(close).toHaveBeenCalled()
  })

  it('throws when nothing gets under the cap', async () => {
    const { close } = stubBrowser({ width: 600, height: 300 }, () => MAX_LOGO_BYTES + 1)

    await expect(fileToLogoDataUrl(file('image/png'))).rejects.toBeInstanceOf(ImageTooLargeError)
    // The bitmap is released even on the failure path.
    expect(close).toHaveBeenCalled()
  })
})
