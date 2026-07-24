// One-off script: sets the demo Supabase Auth user's display name.
// Reads Supabase URL/anon key and demo credentials from frontend/.env
// (self-service update via the demo user's own JWT — no service-role key
// needed, same call as ProfileSettings' "Save Profile" would make).
//
// Run: npx tsx backend/scripts/set-demo-display-name.ts

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const DISPLAY_NAME = 'Kim Lim Hoe'

function loadEnv(path: string): Record<string, string> {
  const env: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = /^([A-Z_]+)=(.*)$/.exec(line.trim())
    if (match) env[match[1]] = match[2]
  }
  return env
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url))
  const env = loadEnv(join(here, '../../frontend/.env'))

  const supabaseUrl = env.VITE_SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY
  const demoEmail = env.VITE_DEMO_EMAIL
  const demoPassword = env.VITE_DEMO_PASSWORD
  if (!supabaseUrl || !anonKey || !demoEmail || !demoPassword) {
    throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / VITE_DEMO_EMAIL / VITE_DEMO_PASSWORD in frontend/.env')
  }

  const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: demoEmail, password: demoPassword }),
  })
  if (!tokenRes.ok) throw new Error(`Sign-in failed: ${tokenRes.status} ${await tokenRes.text()}`)
  const { access_token: accessToken } = (await tokenRes.json()) as { access_token: string }

  const updateRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: 'PUT',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: { display_name: DISPLAY_NAME } }),
  })
  if (!updateRes.ok) throw new Error(`Update failed: ${updateRes.status} ${await updateRes.text()}`)

  console.log(`Demo account display name set to "${DISPLAY_NAME}".`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
