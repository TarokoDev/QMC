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
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}
