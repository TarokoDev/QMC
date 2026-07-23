import { Router } from 'express'
import { asyncHandler } from '../async-handler.js'
import { buildSectionsCreateInput } from '../clone-quote.js'
import { todaySGDateString } from '../date-utils.js'
import { prisma } from '../db.js'
import {
  BLANK_QUOTE,
  masterTemplateInclude,
  toClientDTO,
  toMasterTemplateDTO,
  toRevisionSummaryDTO,
} from '../quote-mapper.js'
import { clientBodySchema } from '../schemas.js'

export const clientsRouter = Router()

clientsRouter.get(
  '/categories/:categoryId/clients',
  asyncHandler(async (req, res) => {
    const clients = await prisma.client.findMany({
      where: { categoryId: req.params.categoryId, category: { folder: { ownerId: req.authUserId } } },
      orderBy: { createdAt: 'asc' },
    })
    res.json(clients.map(toClientDTO))
  }),
)

// Creates a client and seeds its first revision (R0), sourced from either
// the master template or a blank quote per `body.source`.
clientsRouter.post(
  '/categories/:categoryId/clients',
  asyncHandler(async (req, res) => {
    const body = clientBodySchema.parse(req.body)
    const category = await prisma.category.findFirst({
      where: { id: req.params.categoryId, folder: { ownerId: req.authUserId } },
      select: { id: true },
    })
    if (!category) return res.status(404).json({ error: 'Category not found' })

    const baseQuote =
      body.source === 'master'
        ? toMasterTemplateDTO(
            (await prisma.masterTemplate.findFirst({
              where: { ownerId: req.authUserId },
              include: masterTemplateInclude,
            })) ?? {
              id: '',
              updatedAt: new Date(),
              quote: null,
            },
          ).quote
        : BLANK_QUOTE

    const client = await prisma.client.create({
      data: {
        categoryId: req.params.categoryId,
        name: body.name,
        email: body.email ?? '',
        contactNumber: body.contactNumber ?? '',
        revisions: {
          create: {
            label: 'R0',
            position: 0,
            quote: {
              create: {
                clientName: body.name,
                projectSite: baseQuote.info.projectSite,
                email: body.email ?? '',
                contact: body.contactNumber ?? '',
                quotationRef: 'R0',
                refNumber: baseQuote.info.refNumber,
                date: todaySGDateString(),
                designer: 'Kim Lim',
                sections: { create: buildSectionsCreateInput(baseQuote.sections) },
              },
            },
          },
        },
      },
    })

    res.status(201).json(toClientDTO(client))
  }),
)

clientsRouter.get(
  '/clients/:id',
  asyncHandler(async (req, res) => {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, category: { folder: { ownerId: req.authUserId } } },
    })
    if (!client) return res.status(404).json({ error: 'Client not found' })
    res.json(toClientDTO(client))
  }),
)

clientsRouter.patch(
  '/clients/:id',
  asyncHandler(async (req, res) => {
    const body = clientBodySchema.parse(req.body)
    const { count } = await prisma.client.updateMany({
      where: { id: req.params.id, category: { folder: { ownerId: req.authUserId } } },
      data: { name: body.name, email: body.email, contactNumber: body.contactNumber },
    })
    if (count === 0) return res.status(404).json({ error: 'Client not found' })

    const client = await prisma.client.findUniqueOrThrow({ where: { id: req.params.id } })
    res.json(toClientDTO(client))
  }),
)

clientsRouter.delete(
  '/clients/:id',
  asyncHandler(async (req, res) => {
    const { count } = await prisma.client.deleteMany({
      where: { id: req.params.id, category: { folder: { ownerId: req.authUserId } } },
    })
    if (count === 0) return res.status(404).json({ error: 'Client not found' })
    res.status(204).end()
  }),
)

clientsRouter.get(
  '/clients/:id/revisions',
  asyncHandler(async (req, res) => {
    const revisions = await prisma.revision.findMany({
      where: { clientId: req.params.id, client: { category: { folder: { ownerId: req.authUserId } } } },
      orderBy: { position: 'asc' },
    })
    res.json(revisions.map(toRevisionSummaryDTO))
  }),
)
