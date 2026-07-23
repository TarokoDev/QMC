import { Router } from 'express'
import { asyncHandler } from '../async-handler.js'
import { buildSectionsCreateInput } from '../clone-quote.js'
import { prisma } from '../db.js'
import { masterTemplateInclude, toMasterTemplateDTO } from '../quote-mapper.js'
import { putQuoteBodySchema } from '../schemas.js'

export const masterTemplateRouter = Router()

masterTemplateRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const masterTemplate =
      (await prisma.masterTemplate.findFirst({ where: { ownerId: req.authUserId }, include: masterTemplateInclude })) ??
      (await prisma.masterTemplate.create({
        data: { ownerId: req.authUserId, quote: { create: {} } },
        include: masterTemplateInclude,
      }))
    res.json(toMasterTemplateDTO(masterTemplate))
  }),
)

masterTemplateRouter.put(
  '/quote',
  asyncHandler(async (req, res) => {
    const body = putQuoteBodySchema.parse(req.body)

    const masterTemplate =
      (await prisma.masterTemplate.findFirst({
        where: { ownerId: req.authUserId },
        select: { id: true, quote: { select: { id: true } } },
      })) ??
      (await prisma.masterTemplate.create({
        data: { ownerId: req.authUserId, quote: { create: {} } },
        select: { id: true, quote: { select: { id: true } } },
      }))
    if (!masterTemplate.quote) return res.status(500).json({ error: 'Master template quote missing' })
    const quoteId = masterTemplate.quote.id

    const updated = await prisma.$transaction(async (tx) => {
      await tx.quote.update({ where: { id: quoteId }, data: body.quote.info })
      await tx.quoteSection.deleteMany({ where: { quoteId } })
      for (const sectionInput of buildSectionsCreateInput(body.quote.sections)) {
        await tx.quoteSection.create({ data: { quoteId, ...sectionInput } })
      }
      // Bump updatedAt even though no scalar MasterTemplate field changed —
      // an empty `data: {}` update is a no-op query, so set it explicitly.
      await tx.masterTemplate.update({ where: { id: masterTemplate.id }, data: { updatedAt: new Date() } })
      return tx.masterTemplate.findUniqueOrThrow({ where: { id: masterTemplate.id }, include: masterTemplateInclude })
    })

    res.json(toMasterTemplateDTO(updated))
  }),
)
