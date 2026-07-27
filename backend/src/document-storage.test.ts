import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  SupabaseStorageUnavailableError,
  createSignedDownloadUrl,
  removeObjects,
  statObject,
} from './document-storage.js'

// The module reads the service-role key per call (like supabase-admin.ts), so
// each test can set the env it needs without resetting module state.

const URL_BASE = 'https://project.supabase.co'

interface Call {
  url: string
  init: RequestInit
}

let calls: Call[] = []

function mockFetch(responder: (call: Call) => Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init: RequestInit = {}) => {
      const call = { url, init }
      calls.push(call)
      return Promise.resolve(responder(call))
    }),
  )
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

beforeEach(() => {
  calls = []
  process.env.SUPABASE_URL = URL_BASE
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('missing service-role key', () => {
  it('throws an actionable error instead of a bare failure', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    mockFetch(() => json({}))

    await expect(createSignedDownloadUrl('a/b/c.pdf', 'c.pdf')).rejects.toBeInstanceOf(
      SupabaseStorageUnavailableError,
    )
    expect(calls).toHaveLength(0)
  })
})

describe('createSignedDownloadUrl', () => {
  it('returns an absolute URL that forces a download under the original name', async () => {
    mockFetch(() => json({ signedURL: '/object/sign/quote-documents/o/r/d.pdf?token=abc' }))

    const url = await createSignedDownloadUrl('o/r/d.pdf', 'Signed Quote R1.pdf')

    expect(url).toBe(
      `${URL_BASE}/storage/v1/object/sign/quote-documents/o/r/d.pdf?token=abc&download=Signed%20Quote%20R1.pdf`,
    )
    expect(calls[0].url).toBe(`${URL_BASE}/storage/v1/object/sign/quote-documents/o/r/d.pdf`)
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ expiresIn: 60 })
  })

  it('fails loudly when Storage answers without a signed URL', async () => {
    mockFetch(() => json({}))
    await expect(createSignedDownloadUrl('o/r/d.pdf', 'd.pdf')).rejects.toThrow(/signedURL/)
  })
})

describe('statObject', () => {
  it('reads the real size and type of the uploaded object', async () => {
    mockFetch(() => json([{ name: 'd.pdf', metadata: { size: 1234, mimetype: 'application/pdf' } }]))

    await expect(statObject('o/r/d.pdf')).resolves.toEqual({
      size: 1234,
      contentType: 'application/pdf',
    })
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ prefix: 'o/r', search: 'd.pdf', limit: 1 })
  })

  it('returns null when the object is not there', async () => {
    mockFetch(() => json([]))
    await expect(statObject('o/r/missing.pdf')).resolves.toBeNull()
  })

  it('returns null on a 404 rather than throwing', async () => {
    mockFetch(() => json({ error: 'not found' }, 404))
    await expect(statObject('o/r/missing.pdf')).resolves.toBeNull()
  })
})

describe('removeObjects', () => {
  it('does nothing at all for an empty list', async () => {
    mockFetch(() => json({}))
    await removeObjects([])
    expect(calls).toHaveLength(0)
  })

  it('chunks large deletes into requests of 100 keys', async () => {
    mockFetch(() => json({}))
    const paths = Array.from({ length: 250 }, (_, index) => `o/r/${index}.pdf`)

    await removeObjects(paths)

    expect(calls).toHaveLength(3)
    const sizes = calls.map((call) => JSON.parse(String(call.init.body)).prefixes.length)
    expect(sizes).toEqual([100, 100, 50])
  })

  it('treats a missing object as already deleted', async () => {
    mockFetch(() => json({ error: 'not found' }, 404))
    await expect(removeObjects(['o/r/gone.pdf'])).resolves.toBeUndefined()
  })

  it('throws on a real storage failure so callers can log it', async () => {
    mockFetch(() => json({ error: 'boom' }, 500))
    await expect(removeObjects(['o/r/d.pdf'])).rejects.toThrow(/500/)
  })
})
