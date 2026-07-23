import { Router } from 'express'
import { asyncHandler } from '../async-handler.js'
import { buildSectionsCreateInput } from '../clone-quote.js'
import { prisma } from '../db.js'
import { categoryInclude, toCategoryDTO } from '../quote-mapper.js'
import { categoryBodySchema, putQuoteBodySchema } from '../schemas.js'

export const categoriesRouter = Router()

categoriesRouter.get(
  '/folders/:folderId/categories',
  asyncHandler(async (req, res) => {
    const categories = await prisma.category.findMany({
      where: { folderId: req.params.folderId },
      include: categoryInclude,
      orderBy: { createdAt: 'asc' },
    })
    res.json(categories.map(toCategoryDTO))
  }),
)

categoriesRouter.post(
  '/folders/:folderId/categories',
  asyncHandler(async (req, res) => {
    const body = categoryBodySchema.parse(req.body)
    const category = await prisma.category.create({
      data: {
        folderId: req.params.folderId,
        name: body.name,
        description: body.description ?? '',
        quote: { create: {} },
      },
      include: categoryInclude,
    })
    res.status(201).json(toCategoryDTO(category))
  }),
)

categoriesRouter.get(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const category = await prisma.category.findUnique({ where: { id: req.params.id }, include: categoryInclude })
    if (!category) return res.status(404).json({ error: 'Category not found' })
    res.json(toCategoryDTO(category))
  }),
)

categoriesRouter.patch(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const body = categoryBodySchema.parse(req.body)
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: { name: body.name, ...(body.description !== undefined ? { description: body.description } : {}) },
      include: categoryInclude,
    })
    res.json(toCategoryDTO(category))
  }),
)

categoriesRouter.delete(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    await prisma.category.delete({ where: { id: req.params.id } })
    res.status(204).end()
  }),
)

categoriesRouter.post(
  '/categories/:id/duplicate',
  asyncHandler(async (req, res) => {
    const body = categoryBodySchema.parse(req.body)
    const source = await prisma.category.findUnique({ where: { id: req.params.id }, include: categoryInclude })
    if (!source) return res.status(404).json({ error: 'Category not found' })

    const created = await prisma.category.create({
      data: {
        folderId: source.folderId,
        name: body.name,
        description: body.description ?? source.description,
        quote: {
          create: {
            clientName: source.quote?.clientName ?? '',
            projectSite: source.quote?.projectSite ?? '',
            email: source.quote?.email ?? '',
            contact: source.quote?.contact ?? '',
            quotationRef: source.quote?.quotationRef ?? 'R0',
            refNumber: source.quote?.refNumber ?? '',
            date: source.quote?.date ?? '',
            designer: source.quote?.designer ?? '',
            sections: { create: buildSectionsCreateInput(source.quote ? toCategoryDTO(source).quote.sections : []) },
          },
        },
      },
      include: categoryInclude,
    })

    res.status(201).json(toCategoryDTO(created))
  }),
)

categoriesRouter.put(
  '/categories/:id/quote',
  asyncHandler(async (req, res) => {
    const body = putQuoteBodySchema.parse(req.body)

    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      select: { quote: { select: { id: true } } },
    })
    if (!category?.quote) return res.status(404).json({ error: 'Category or quote not found' })
    const quoteId = category.quote.id

    const updated = await prisma.$transaction(async (tx) => {
      await tx.quote.update({ where: { id: quoteId }, data: body.quote.info })

      // Wholesale replace sections/areas/items — simplest correct approach
      // for a low-frequency autosave; cascade delete handles areas/items.
      await tx.quoteSection.deleteMany({ where: { quoteId } })
      for (const sectionInput of buildSectionsCreateInput(body.quote.sections)) {
        await tx.quoteSection.create({ data: { quoteId, ...sectionInput } })
      }

      return tx.category.findUniqueOrThrow({ where: { id: req.params.id }, include: categoryInclude })
    })

    res.json(toCategoryDTO(updated))
  }),
)
