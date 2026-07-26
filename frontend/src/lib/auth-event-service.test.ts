import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Hoisted so the `@/lib/supabase-client` mock factory below can close over it.
const { getAccessToken } = vi.hoisted(() => ({ getAccessToken: vi.fn() }))

vi.mock('@/lib/supabase-client', () => ({ getAccessToken }))

// api-client reads VITE_API_URL at module load; stub it before the import so
// the tests don't depend on a local .env (CI has none).
vi.stubEnv('VITE_API_URL', 'http://api.test')

const { fetchAdminUsers, fetchGlobalMetrics, fetchUserMetrics, fetchAuthEvents, fetchUserRevision, recordAuthEvent } =
  await import('@/lib/auth-event-service')

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    json: async () => body,
  } as Response
}

function lastCall(fetchMock: ReturnType<typeof vi.fn>) {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit]
  return { url, init }
}

describe('auth-event-service', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(jsonResponse({ events: [], nextCursor: null }))
    vi.stubGlobal('fetch', fetchMock)
    getAccessToken.mockResolvedValue('token')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts only the event kind — the actor comes from the JWT, never the body', async () => {
    fetchMock.mockResolvedValue(jsonResponse(null, 204))

    await recordAuthEvent('logout')

    const { url, init } = lastCall(fetchMock)
    expect(url).toBe('http://api.test/api/auth-events')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ event: 'logout' })
  })

  it('builds the auth-events query string from the filters it is given', async () => {
    await fetchAuthEvents({ limit: 25, cursor: 'row-9', event: 'login', authUserId: 'uid-1' })

    expect(lastCall(fetchMock).url).toBe(
      'http://api.test/api/admin/auth-events?limit=25&cursor=row-9&event=login&authUserId=uid-1',
    )
  })

  it('passes the date range through to both metrics and the log', async () => {
    const range = { from: '2026-07-01T00:00:00.000Z', to: '2026-07-26T23:59:59.999Z' }

    await fetchGlobalMetrics(range)
    expect(lastCall(fetchMock).url).toContain('from=2026-07-01T00%3A00%3A00.000Z')

    await fetchAuthEvents({ limit: 50, ...range })
    expect(lastCall(fetchMock).url).toContain('to=2026-07-26T23%3A59%3A59.999Z')
  })

  it('scopes metrics to one user when given an id', async () => {
    await fetchUserMetrics('uid-1')
    expect(lastCall(fetchMock).url).toBe('http://api.test/api/admin/metrics?authUserId=uid-1')
  })

  it('asks the server to bypass its user cache only when refreshing', async () => {
    await fetchAdminUsers()
    expect(lastCall(fetchMock).url).toBe('http://api.test/api/admin/users')

    await fetchAdminUsers({ refresh: true })
    expect(lastCall(fetchMock).url).toBe('http://api.test/api/admin/users?refresh=1')
  })

  // The drill-down is GET-only by design: no write route accepts another
  // user's id, so an admin cannot alter a designer's data.
  it('reads another user\'s revision through the admin namespace', async () => {
    await fetchUserRevision('uid-1', 'rev-2')

    const { url, init } = lastCall(fetchMock)
    expect(url).toBe('http://api.test/api/admin/users/uid-1/revisions/rev-2')
    expect(init?.method).toBeUndefined()
  })

  it('omits empty filters rather than sending blank params the backend would reject', async () => {
    await fetchAuthEvents({ limit: 50, authUserId: '' })

    expect(lastCall(fetchMock).url).toBe('http://api.test/api/admin/auth-events?limit=50')
  })

  it('sends no query string when there are no filters at all', async () => {
    await fetchAuthEvents()

    expect(lastCall(fetchMock).url).toBe('http://api.test/api/admin/auth-events')
  })

  it('surfaces the 403 a non-admin gets from the metrics endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Forbidden' }, 403))

    await expect(fetchGlobalMetrics()).rejects.toMatchObject({ status: 403, message: 'Forbidden' })
  })
})
