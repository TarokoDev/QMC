import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Hoisted so the `@/lib/supabase-client` mock factory below can close over it.
const { getAccessToken } = vi.hoisted(() => ({ getAccessToken: vi.fn() }))

vi.mock('@/lib/supabase-client', () => ({ getAccessToken }))

// api-client reads VITE_API_URL at module load; stub it before the import so
// the tests don't depend on a local .env (CI has none).
vi.stubEnv('VITE_API_URL', 'http://api.test')

const { api, ApiError } = await import('@/lib/api-client')

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    json: async () => body,
  } as Response
}

function lastRequestHeaders(fetchMock: ReturnType<typeof vi.fn>): Record<string, string> {
  const [, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit]
  return init.headers as Record<string, string>
}

describe('api-client auth header', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)
    getAccessToken.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('waits for an access token that resolves asynchronously', async () => {
    // The regression: the token used to be read synchronously from a variable
    // populated by an async auth listener, so a request racing app mount went
    // out unauthenticated and 401'd. A token that resolves on a later tick must
    // still make it onto the request.
    getAccessToken.mockImplementation(
      () => new Promise<string>((resolve) => setTimeout(() => resolve('late-token'), 10)),
    )

    await api.get('/api/folders')

    expect(lastRequestHeaders(fetchMock).Authorization).toBe('Bearer late-token')
  })

  it('omits the Authorization header when there is genuinely no session', async () => {
    getAccessToken.mockResolvedValue(null)

    await api.get('/api/folders')

    expect(lastRequestHeaders(fetchMock)).not.toHaveProperty('Authorization')
  })

  it('throws ApiError carrying the status on a non-2xx response', async () => {
    getAccessToken.mockResolvedValue('token')
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Unauthorized' }, 401))

    await expect(api.get('/api/folders')).rejects.toMatchObject({ status: 401, message: 'Unauthorized' })
    await expect(api.get('/api/folders')).rejects.toBeInstanceOf(ApiError)
  })
})
