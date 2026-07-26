import type { NextFunction, Request, Response } from 'express'

/**
 * Restricts a route to the admin role. Must be mounted after `requireAuth` —
 * the role is read only from `req.authRole` (a verified JWT claim), never from
 * a header or body a caller could set.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.authRole !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' })
  }
  next()
}
