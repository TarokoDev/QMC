import type { NextFunction, Request, Response } from 'express'
import { createRemoteJWKSet, jwtVerify } from 'jose'

declare global {
  namespace Express {
    interface Request {
      authUserId: string
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL
const jwks = supabaseUrl ? createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`)) : null

/** Verifies the Supabase Auth JWT (ES256, via Supabase's JWKS — cached, not re-fetched per request) and attaches `req.authUserId`. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined

  if (!token || !jwks) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { payload } = await jwtVerify(token, jwks)
    req.authUserId = payload.sub as string
    next()
  } catch (err) {
    // Distinguish "this token is bad" from "we couldn't reach the JWKS to check".
    // Collapsing both into 401 made a transient Supabase/network blip look like a
    // signed-out user, which the frontend then renders as an empty folder list.
    const code = (err as { code?: string }).code
    if (code === 'ERR_JWKS_TIMEOUT' || code === 'ERR_JWKS_NO_MATCHING_KEY' || code === 'ERR_JWKS_MULTIPLE_MATCHING_KEYS') {
      console.error('JWKS verification unavailable:', err)
      return res.status(503).json({ error: 'Auth verification temporarily unavailable' })
    }
    res.status(401).json({ error: 'Unauthorized' })
  }
}
