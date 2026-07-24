import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { asyncHandler } from '../async-handler.js'
import { DEMO_CLIENTS, buildDemoQuoteSections, flattenQuoteSections } from '../demo-seed-data.js'
import { prisma } from '../db.js'

export const demoRouter = Router()

// Wipes and reseeds the fixed demo dataset owned by DEMO_USER_ID. Guarded so
// this destructive route can never run against a real user's data.
//
// Inserted level-by-level with `createMany` (ids generated up front) rather
// than Prisma's nested `create` — the demo tree is ~500 rows, and nested
// `create` issues one round trip per row, which is far too slow over the
// pooled Supabase connection. This trades atomicity for speed; a failed
// reset can simply be retried.
demoRouter.post(
  '/reset',
  asyncHandler(async (req, res) => {
    const demoUserId = process.env.DEMO_USER_ID
    if (!demoUserId || req.authUserId !== demoUserId) {
      return res.status(403).json({ error: 'Not the demo account' })
    }

    await prisma.folder.deleteMany({ where: { ownerId: demoUserId } })
    await prisma.masterTemplate.deleteMany({ where: { ownerId: demoUserId } })

    const folderId = randomUUID()
    const categories = DEMO_CLIENTS.map((client) => ({ id: randomUUID(), client }))
    const clients = categories.map(({ id: categoryId, client }) => ({ id: randomUUID(), categoryId, client }))
    const revisions = clients.flatMap(({ id: clientId, client }) =>
      client.revisions.map((revision, index) => ({
        id: randomUUID(),
        clientId,
        label: revision.label,
        position: index,
        revision,
        client,
        revisionIndex: index,
      })),
    )
    const masterTemplateId = randomUUID()

    await prisma.folder.create({ data: { id: folderId, name: 'HDB', ownerId: demoUserId } })

    await prisma.category.createMany({
      data: categories.map(({ id, client }) => ({ id, folderId, name: client.categoryName, description: '' })),
    })

    await prisma.client.createMany({
      data: clients.map(({ id, categoryId, client }) => ({
        id,
        categoryId,
        name: client.clientName,
        email: client.email,
        contactNumber: client.contactNumber,
      })),
    })

    await prisma.revision.createMany({
      data: revisions.map(({ id, clientId, label, position }) => ({ id, clientId, label, position })),
    })

    await prisma.masterTemplate.create({ data: { id: masterTemplateId, ownerId: demoUserId } })

    const quotes = [
      ...revisions.map((r) => ({
        id: randomUUID(),
        revisionId: r.id,
        masterTemplateId: null as string | null,
        clientName: r.client.clientName,
        projectSite: `Blk 123 Example Street, #0${r.revisionIndex + 1}-45, Singapore 560123`,
        email: r.client.email,
        contact: r.client.contactNumber,
        quotationRef: r.revision.label,
        refNumber: r.revision.refNumber,
        date: r.revision.date,
        designer: 'Kim Lim',
      })),
      {
        id: randomUUID(),
        revisionId: null as string | null,
        masterTemplateId,
        clientName: '',
        projectSite: '',
        email: '',
        contact: '',
        quotationRef: 'R0',
        refNumber: '',
        date: '',
        designer: '',
      },
    ]

    await prisma.quote.createMany({ data: quotes })

    const sectionRows: ReturnType<typeof flattenQuoteSections>['sectionRows'] = []
    const areaRows: ReturnType<typeof flattenQuoteSections>['areaRows'] = []
    const itemRows: ReturnType<typeof flattenQuoteSections>['itemRows'] = []
    for (const quote of quotes) {
      const flattened = flattenQuoteSections(quote.id, buildDemoQuoteSections())
      sectionRows.push(...flattened.sectionRows)
      areaRows.push(...flattened.areaRows)
      itemRows.push(...flattened.itemRows)
    }

    await prisma.quoteSection.createMany({ data: sectionRows })
    await prisma.areaOfWork.createMany({ data: areaRows })
    await prisma.lineItem.createMany({ data: itemRows })

    res.status(204).end()
  }),
)
