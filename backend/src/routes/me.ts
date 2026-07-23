import { Router } from 'express'
import { asyncHandler } from '../async-handler.js'
import { prisma } from '../db.js'

export const meRouter = Router()

meRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const user = await prisma.user.findFirst()
    if (!user) return res.status(500).json({ error: 'User not seeded — run `npx prisma db seed`' })
    res.json({ name: user.name, initials: user.initials })
  }),
)
