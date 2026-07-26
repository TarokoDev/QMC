/**
 * Assigns the app role stored in a Supabase user's `app_metadata.role`.
 *
 *   npm run roles                      # list every user and their current role
 *   npm run roles -- <email> <role>    # assign admin | designer | demo
 *
 * Roles live in `app_metadata` because users can edit their own `user_metadata`
 * (ProfileSettings writes display name/phone there) but not this. Writing it
 * requires the service-role key.
 *
 * The new role only reaches the user once they sign out and back in — the claim
 * is baked into the JWT at issue time.
 */

import { APP_ROLES, type AppRole } from '../src/require-auth.js'
import { listAuthUsers } from '../src/supabase-admin.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function requireEnv() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env.\n' +
        'Find the service role key in the Supabase dashboard → Project Settings → API.\n' +
        'It bypasses all row-level security — keep it out of the frontend and out of git.',
    )
    process.exit(1)
  }
}

async function adminFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE_KEY as string,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!res.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${res.status} ${await res.text()}`)
  }
  return res.json()
}

async function main() {
  requireEnv()
  const [email, role] = process.argv.slice(2)

  // Reads go through the same module the server uses, so the two can't disagree
  // about how a missing role claim is interpreted.
  const users = await listAuthUsers({ refresh: true })

  if (!email) {
    for (const user of users) {
      const shown = user.role === 'designer' ? 'designer (or unset)' : user.role
      console.log(`${(user.email || '(no email)').padEnd(36)} ${shown.padEnd(22)} ${user.id}`)
    }
    return
  }

  if (!APP_ROLES.includes(role as AppRole)) {
    console.error(`Usage: npm run roles -- <email> <${APP_ROLES.join('|')}>`)
    process.exit(1)
  }

  const target = users.find((user) => user.email.toLowerCase() === email.toLowerCase())
  if (!target) {
    console.error(`No Supabase user with email ${email}. Run \`npm run roles\` to list them.`)
    process.exit(1)
  }

  // PUT replaces app_metadata wholesale, so read the current object and merge
  // rather than clobbering what Supabase keeps there (provider, providers, …).
  const current = (await adminFetch(`/users/${target.id}`)) as { app_metadata?: Record<string, unknown> }

  await adminFetch(`/users/${target.id}`, {
    method: 'PUT',
    body: JSON.stringify({ app_metadata: { ...current.app_metadata, role } }),
  })

  console.log(`${email} → ${role} (${target.id})`)
  console.log('They must sign out and back in for the new role to take effect.')
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
