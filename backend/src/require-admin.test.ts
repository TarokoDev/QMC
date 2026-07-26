import type { NextFunction, Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

import { requireAdmin } from './require-admin.js'

function run(authRole: unknown) {
  const req = { authRole } as Request
  const json = vi.fn()
  const res = { status: vi.fn(() => ({ json })) } as unknown as Response
  const next = vi.fn() as NextFunction

  requireAdmin(req, res, next)
  return { res, json, next }
}

describe('requireAdmin', () => {
  it('lets an admin through', () => {
    const { next, res } = run('admin')
    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it.each(['designer', 'demo'])('rejects the %s role with 403', (role) => {
    const { next, res, json } = run(role)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(json).toHaveBeenCalledWith({ error: 'Forbidden' })
  })

  // requireAuth defaults a missing claim to 'designer', but the guard must not
  // depend on that having run correctly — an absent role is never an admin.
  it('rejects a request with no role at all', () => {
    const { next, res } = run(undefined)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })
})
