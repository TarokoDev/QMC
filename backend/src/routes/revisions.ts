import { Router } from 'express'
import { asyncHandler } from '../async-handler.js'
import { buildSectionsCreateInput } from '../clone-quote.js'
import { prisma } from '../db.js'
import { revisionInclude, toRevisionDTO } from '../quote-mapper.js'
import { putQuoteBodySchema } from '../schemas.js'

export const revisionsRouter = Router()

// Clones the given revision (or the client's latest, if none specified) into
// a new revision — mirrors the frontend's "+" clone-active-revision action.
revisionsRouter.post(
  '/clients/:clientId/revisions',
  asyncHandler(async (req, res) => {
    const sourceId = typeof req.body?.cloneFromRevisionId === 'string' ? req.body.cloneFromRevisionId : undefined

    const ownedByRequester = { client: { category: { folder: { ownerId: req.authUserId } } } }

    const source = sourceId
      ? await prisma.revision.findFirst({ where: { id: sourceId, ...ownedByRequester }, include: revisionInclude })
      : await prisma.revision.findFirst({
          where: { clientId: req.params.clientId, ...ownedByRequester },
          orderBy: { position: 'desc' },
          include: revisionInclude,
        })
    if (!source) return res.status(404).json({ error: 'No revision to clone from' })

    const client = await prisma.client.findFirst({
      where: { id: req.params.clientId, category: { folder: { ownerId: req.authUserId } } },
    })
    if (!client) return res.status(404).json({ error: 'Client not found' })

    const existingCount = await prisma.revision.count({ where: { clientId: req.params.clientId } })
    const label = `R${existingCount}`
    const sourceQuote = toRevisionDTO(source).quote

    const created = await prisma.revision.create({
      data: {
        clientId: req.params.clientId,
        label,
        position: existingCount,
        quote: {
          create: {
            clientName: sourceQuote.info.clientName,
            projectSite: sourceQuote.info.projectSite,
            email: sourceQuote.info.email,
            contact: sourceQuote.info.contact,
            quotationRef: label,
            refNumber: sourceQuote.info.refNumber,
            date: sourceQuote.info.date,
            designer: sourceQuote.info.designer,
            sections: { create: buildSectionsCreateInput(sourceQuote.sections) },
          },
        },
      },
      include: revisionInclude,
    })

    res.status(201).json(toRevisionDTO(created))
  }),
)

revisionsRouter.get(
  '/revisions/:id',
  asyncHandler(async (req, res) => {
    const revision = await prisma.revision.findFirst({
      where: { id: req.params.id, client: { category: { folder: { ownerId: req.authUserId } } } },
      include: revisionInclude,
    })
    if (!revision) return res.status(404).json({ error: 'Revision not found' })
    res.json(toRevisionDTO(revision))
  }),
)

// Only the latest revision can be deleted, and never R0 (position 0) —
// mirrors the frontend's "only the last chip gets a delete button" rule.
revisionsRouter.delete(
  '/revisions/:id',
  asyncHandler(async (req, res) => {
    const revision = await prisma.revision.findFirst({
      where: { id: req.params.id, client: { category: { folder: { ownerId: req.authUserId } } } },
    })
    if (!revision) return res.status(404).json({ error: 'Revision not found' })
    if (revision.position === 0) return res.status(400).json({ error: 'Cannot delete R0' })

    const latest = await prisma.revision.findFirst({
      where: { clientId: revision.clientId },
      orderBy: { position: 'desc' },
    })
    if (latest?.id !== revision.id) return res.status(400).json({ error: 'Only the latest revision can be deleted' })

    await prisma.revision.delete({ where: { id: req.params.id } })
    res.status(204).end()
  }),
)

revisionsRouter.put(
  '/revisions/:id/quote',
  asyncHandler(async (req, res) => {
    const body = putQuoteBodySchema.parse(req.body)

    const revision = await prisma.revision.findFirst({
      where: { id: req.params.id, client: { category: { folder: { ownerId: req.authUserId } } } },
      select: { quote: { select: { id: true } } },
    })
    if (!revision?.quote) return res.status(404).json({ error: 'Revision or quote not found' })
    const quoteId = revision.quote.id

    const updated = await prisma.$transaction(async (tx) => {
      await tx.quote.update({ where: { id: quoteId }, data: body.quote.info })
      await tx.quoteSection.deleteMany({ where: { quoteId } })
      for (const sectionInput of buildSectionsCreateInput(body.quote.sections)) {
        await tx.quoteSection.create({ data: { quoteId, ...sectionInput } })
      }
      return tx.revision.findUniqueOrThrow({ where: { id: req.params.id }, include: revisionInclude })
    })

    res.json(toRevisionDTO(updated))
  }),
)
