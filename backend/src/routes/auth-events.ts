import { Router } from 'express'
import { asyncHandler } from '../async-handler.js'
import { prisma } from '../db.js'
import { authEventBodySchema } from '../schemas.js'

export const authEventsRouter = Router()

/** A repeated login inside this window is treated as the same sign-in. */
const LOGIN_DEDUPE_MS = 30_000

// Records an explicit sign-in or sign-out. The actor is always taken from the
// verified JWT, so a caller can only ever log an event about itself.
authEventsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { event } = authEventBodySchema.parse(req.body)

    // A double form submit (or React StrictMode's double effect) would otherwise
    // put two identical login rows in the admin log seconds apart.
    if (event === 'login') {
      const recent = await prisma.authEvent.findFirst({
        where: {
          authUserId: req.authUserId,
          event: 'login',
          createdAt: { gte: new Date(Date.now() - LOGIN_DEDUPE_MS) },
        },
        select: { id: true },
      })
      if (recent) return res.status(204).end()
    }

    await prisma.authEvent.create({
      data: {
        authUserId: req.authUserId,
        email: req.authEmail,
        role: req.authRole,
        event,
        ipAddress: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      },
    })

    res.status(204).end()
  }),
)
