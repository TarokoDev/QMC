import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Same shape as api-client.test.ts: the token source is mocked, and the env
// vars are stubbed before import because both modules read them at load.
const { getAccessToken } = vi.hoisted(() => ({ getAccessToken: vi.fn() }))
vi.mock('@/lib/supabase-client', () => ({ getAccessToken }))

vi.stubEnv('VITE_API_URL', 'http://api.test')
vi.stubEnv('VITE_SUPABASE_URL', 'http://supabase.test')
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')

const { FileTooLargeError, MAX_DOCUMENT_BYTES, formatFileSize, uploadDocument } = await import(
  '@/lib/document-service'
)

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    json: async () => body,
  } as Response
}

const TICKET = {
  document: { id: 'doc-1', revisionId: 'rev-1', fileName: 'q.pdf', contentType: 'application/pdf', sizeBytes: 10, createdAt: '' },
  bucket: 'quote-documents',
  storagePath: 'owner/rev-1/doc-1.pdf',
}

/** Minimal XHR stand-in; `uploadStatus` decides how the transfer ends. */
function stubXhr(uploadStatus: number) {
  const instances: Record<string, unknown>[] = []
  vi.stubGlobal(
    'XMLHttpRequest',
    class {
      status = uploadStatus
      upload: { onprogress?: (event: ProgressEvent) => void } = {}
      onload?: () => void
      onerror?: () => void
      onabort?: () => void
      open = vi.fn()
      setRequestHeader = vi.fn()
      send = vi.fn(() => {
        this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 } as ProgressEvent)
        this.onload?.()
      })
      constructor() {
        instances.push(this as unknown as Record<string, unknown>)
      }
    },
  )
  return instances
}

function file(name = 'quote.pdf', size = 1024): File {
  const value = new File(['x'], name, { type: 'application/pdf' })
  Object.defineProperty(value, 'size', { value: size })
  return value
}

/** Every API call made, as `METHOD /path`. */
function apiCalls(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls.map(([url, init]) => `${(init as RequestInit)?.method ?? 'GET'} ${url}`)
}

describe('uploadDocument', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    getAccessToken.mockResolvedValue('token')
    fetchMock = vi.fn().mockResolvedValue(jsonResponse(TICKET))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('rejects an oversized file before touching the network', async () => {
    stubXhr(200)

    await expect(uploadDocument('rev-1', file('huge.skp', MAX_DOCUMENT_BYTES + 1))).rejects.toBeInstanceOf(
      FileTooLargeError,
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reserves a row, uploads the bytes, then confirms', async () => {
    const xhrs = stubXhr(200)
    fetchMock
      .mockResolvedValueOnce(jsonResponse(TICKET))
      .mockResolvedValueOnce(jsonResponse({ ...TICKET.document, sizeBytes: 1024 }))

    const progress: number[] = []
    const document = await uploadDocument('rev-1', file(), (fraction) => progress.push(fraction))

    expect(document.id).toBe('doc-1')
    expect(apiCalls(fetchMock)).toEqual([
      'POST http://api.test/api/revisions/rev-1/documents',
      'POST http://api.test/api/documents/doc-1/confirm',
    ])
    expect(xhrs[0].open).toHaveBeenCalledWith(
      'POST',
      'http://supabase.test/storage/v1/object/quote-documents/owner/rev-1/doc-1.pdf',
    )
    expect(progress).toEqual([0.5, 1])
  })

  it('deletes the reserved row when the upload itself fails', async () => {
    stubXhr(500)

    await expect(uploadDocument('rev-1', file())).rejects.toThrow(/Upload failed: 500/)

    expect(apiCalls(fetchMock)).toEqual([
      'POST http://api.test/api/revisions/rev-1/documents',
      'DELETE http://api.test/api/documents/doc-1',
    ])
  })

  it('deletes the reserved row when confirmation fails', async () => {
    stubXhr(200)
    fetchMock
      .mockResolvedValueOnce(jsonResponse(TICKET))
      .mockResolvedValueOnce(jsonResponse({ error: 'Upload did not complete' }, 409))
      .mockResolvedValueOnce(jsonResponse(null, 204))

    await expect(uploadDocument('rev-1', file())).rejects.toMatchObject({ status: 409 })

    expect(apiCalls(fetchMock)).toEqual([
      'POST http://api.test/api/revisions/rev-1/documents',
      'POST http://api.test/api/documents/doc-1/confirm',
      'DELETE http://api.test/api/documents/doc-1',
    ])
  })

  it('still reports the original failure when the cleanup delete also fails', async () => {
    stubXhr(500)
    fetchMock
      .mockResolvedValueOnce(jsonResponse(TICKET))
      .mockRejectedValueOnce(new Error('offline'))

    await expect(uploadDocument('rev-1', file())).rejects.toThrow(/Upload failed: 500/)
  })
})

describe('formatFileSize', () => {
  it('reads the way a filename label should', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(2048)).toBe('2.0 KB')
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB')
    expect(formatFileSize(48 * 1024 * 1024)).toBe('48 MB')
  })
})
