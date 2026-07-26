import { APP_ROLES, type AppRole } from './require-auth.js'

/**
 * Thin read wrapper over the Supabase Auth Admin API, used so the admin
 * dashboard can list accounts that have never signed in (the `auth_events`
 * table only knows about users who have).
 *
 * The service-role key this needs bypasses row-level security and can mint
 * tokens, change passwords, and delete users. It is read here and nowhere else,
 * only ever reaches admin-gated routes, and only these five fields per user are
 * exposed — never the raw Admin API response, and never a proxied Admin call.
 */

export interface AuthUser {
  id: string
  email: string
  role: AppRole
  createdAt: string
  lastSignInAt: string | null
}

/** Thrown when the service-role key is absent, so routes can answer 503 with something actionable instead of a bare 500. */
export class SupabaseAdminUnavailableError extends Error {}

interface AdminApiUser {
  id: string
  email?: string
  created_at: string
  last_sign_in_at?: string | null
  app_metadata?: { role?: string }
}

const PAGE_SIZE = 200
const CACHE_TTL_MS = 60_000

let cache: { users: AuthUser[]; at: number } | null = null

function roleOf(user: AdminApiUser): AppRole {
  const claimed = user.app_metadata?.role
  return APP_ROLES.includes(claimed as AppRole) ? (claimed as AppRole) : 'designer'
}

async function adminFetch(path: string): Promise<unknown> {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new SupabaseAdminUnavailableError(
      'SUPABASE_SERVICE_ROLE_KEY is not set — the user directory is unavailable. See backend/.env.example.',
    )
  }

  const res = await fetch(`${url}/auth/v1/admin${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })

  if (!res.ok) {
    throw new Error(`Supabase admin GET ${path} failed: ${res.status}`)
  }
  return res.json()
}

/**
 * Every Supabase Auth user, newest sign-in data included.
 *
 * Cached for a minute: the roster changes rarely, and the dashboard would
 * otherwise call Supabase on every tile render. Pass `{ refresh: true }` (the
 * dashboard's Refresh button) to bypass the cache.
 */
export async function listAuthUsers({ refresh = false } = {}): Promise<AuthUser[]> {
  if (!refresh && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.users
  }

  const users: AuthUser[] = []
  // The endpoint pages (default 50); without following pages a project with
  // more users than one page would silently look like it had fewer.
  for (let page = 1; ; page++) {
    const body = (await adminFetch(`/users?page=${page}&per_page=${PAGE_SIZE}`)) as { users: AdminApiUser[] }
    users.push(
      ...body.users.map((user) => ({
        id: user.id,
        email: user.email ?? '',
        role: roleOf(user),
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
      })),
    )
    if (body.users.length < PAGE_SIZE) break
  }

  cache = { users, at: Date.now() }
  return users
}
