import { Router } from 'express'
import { asyncHandler } from '../async-handler.js'
import { prisma } from '../db.js'
import {
  categoryOwnedBy,
  clientOwnedBy,
  folderOwnedBy,
  revisionOwnedBy,
} from '../owner-scope.js'
import {
  categoryInclude,
  revisionInclude,
  toCategoryDTO,
  toClientDTO,
  toRevisionDTO,
  toRevisionDocumentDTO,
  toRevisionSummaryDTO,
} from '../quote-mapper.js'
import { sumQuoteTotals } from '../quote-totals.js'
import { requireAdmin } from '../require-admin.js'
import { adminMetricsQuerySchema, authEventQuerySchema, refreshQuerySchema } from '../schemas.js'
import { SupabaseStorageUnavailableError, createSignedDownloadUrl } from '../document-storage.js'
import { SupabaseAdminUnavailableError, listAuthUsers } from '../supabase-admin.js'

export const adminRouter = Router()

// Every route below is admin-only. This is the real boundary — the frontend
// route guard is UX only.
adminRouter.use(requireAdmin)

async function gstRate(): Promise<number> {
  const config = await prisma.quoteConfig.findFirst({ select: { gstRate: true } })
  return config ? Number(config.gstRate) : 0
}

/**
 * Value of everything a user has quoted: the latest revision per client (the
 * one intended to go to the client — highest `position`), summed.
 *
 * Totals are computed in TS via `quote-totals.ts` rather than SQL because the
 * complete → included → inc/foc gating is the most heavily tested rule in the
 * codebase and must not be forked into a second dialect.
 */
async function quoteValueFor(ownerId: string) {
  const clients = await prisma.client.findMany({
    where: clientOwnedBy(ownerId),
    select: {
      revisions: {
        orderBy: { position: 'desc' },
        take: 1,
        include: revisionInclude,
      },
    },
  })

  const latest = clients.flatMap((client) => client.revisions)
  const quotes = latest.map((revision) => toRevisionDTO(revision).quote)

  return { latestRevisions: latest.length, ...sumQuoteTotals(quotes, await gstRate()) }
}

// ---------------------------------------------------------------- user directory

adminRouter.get(
  '/users',
  asyncHandler(async (req, res) => {
    const { refresh } = refreshQuerySchema.parse(req.query)

    let authUsers
    try {
      authUsers = await listAuthUsers({ refresh })
    } catch (err) {
      if (err instanceof SupabaseAdminUnavailableError) {
        return res.status(503).json({ error: err.message })
      }
      throw err
    }

    // Aggregates come from our own table; Supabase's `last_sign_in_at` counts
    // token refreshes, while `auth_events` records deliberate sign-ins only.
    const [logins, logouts, lastSeen] = await Promise.all([
      prisma.authEvent.groupBy({ by: ['authUserId'], where: { event: 'login' }, _count: { _all: true } }),
      prisma.authEvent.groupBy({ by: ['authUserId'], where: { event: 'logout' }, _count: { _all: true } }),
      prisma.authEvent.groupBy({ by: ['authUserId'], _max: { createdAt: true } }),
    ])

    const loginsBy = new Map(logins.map((row) => [row.authUserId, row._count._all]))
    const logoutsBy = new Map(logouts.map((row) => [row.authUserId, row._count._all]))
    const lastSeenBy = new Map(lastSeen.map((row) => [row.authUserId, row._max.createdAt]))

    const users = authUsers.map((user) => ({
      ...user,
      deleted: false,
      logins: loginsBy.get(user.id) ?? 0,
      logouts: logoutsBy.get(user.id) ?? 0,
      lastSeen: lastSeenBy.get(user.id)?.toISOString() ?? null,
    }))

    // A user deleted from Supabase still owns rows in auth_events; surfacing
    // them keeps the log attributable instead of showing orphan UUIDs.
    const known = new Set(authUsers.map((user) => user.id))
    for (const [authUserId, seenAt] of lastSeenBy) {
      if (known.has(authUserId)) continue
      users.push({
        id: authUserId,
        email: '(deleted account)',
        role: 'designer',
        createdAt: seenAt?.toISOString() ?? new Date(0).toISOString(),
        lastSignInAt: null,
        deleted: true,
        logins: loginsBy.get(authUserId) ?? 0,
        logouts: logoutsBy.get(authUserId) ?? 0,
        lastSeen: seenAt?.toISOString() ?? null,
      })
    }

    res.json({ users })
  }),
)

// ---------------------------------------------------------------- metrics

adminRouter.get(
  '/metrics',
  asyncHandler(async (req, res) => {
    const { authUserId, from, to } = adminMetricsQuerySchema.parse(req.query)
    const range = { gte: from, lte: to }

    if (!authUserId) {
      const [totalEvents, logins, activeUsers, folders, clients, revisions] = await Promise.all([
        prisma.authEvent.count(),
        prisma.authEvent.count({ where: { event: 'login', createdAt: range } }),
        prisma.authEvent.findMany({
          where: { event: 'login', createdAt: range },
          distinct: ['authUserId'],
          select: { authUserId: true },
        }),
        prisma.folder.count(),
        prisma.client.count(),
        prisma.revision.count(),
      ])

      return res.json({
        scope: 'global' as const,
        from: from.toISOString(),
        to: to.toISOString(),
        totalEvents,
        logins,
        activeUsers: activeUsers.length,
        folders,
        clients,
        revisions,
      })
    }

    const [logins, logouts, lastEvent, folders, categories, clients, revisions, clientsCreated, revisionsCreated, value] =
      await Promise.all([
        prisma.authEvent.count({ where: { authUserId, event: 'login', createdAt: range } }),
        prisma.authEvent.count({ where: { authUserId, event: 'logout', createdAt: range } }),
        prisma.authEvent.findFirst({ where: { authUserId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
        prisma.folder.count({ where: folderOwnedBy(authUserId) }),
        prisma.category.count({ where: categoryOwnedBy(authUserId) }),
        prisma.client.count({ where: clientOwnedBy(authUserId) }),
        prisma.revision.count({ where: revisionOwnedBy(authUserId) }),
        prisma.client.count({ where: { ...clientOwnedBy(authUserId), createdAt: range } }),
        prisma.revision.count({ where: { ...revisionOwnedBy(authUserId), createdAt: range } }),
        quoteValueFor(authUserId),
      ])

    res.json({
      scope: 'user' as const,
      authUserId,
      from: from.toISOString(),
      to: to.toISOString(),
      // `lastSeen` is deliberately all-time — "never active in this window" and
      // "never active at all" are different answers.
      lastSeen: lastEvent?.createdAt.toISOString() ?? null,
      logins,
      logouts,
      folders,
      categories,
      clients,
      revisions,
      clientsCreated,
      revisionsCreated,
      ...value,
    })
  }),
)

// ---------------------------------------------------------------- auth event log

// Paged login/logout log, newest first. Paging uses a row id rather than a
// timestamp: `created_at` is not unique, so a timestamp cursor silently drops
// rows written in the same millisecond.
adminRouter.get(
  '/auth-events',
  asyncHandler(async (req, res) => {
    const { limit, cursor, authUserId, event, from, to } = authEventQuerySchema.parse(req.query)

    const rows = await prisma.authEvent.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        ...(authUserId ? { authUserId } : {}),
        ...(event ? { event } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    // The extra row is only a probe for "is there more" — it belongs to the next page.
    const hasMore = rows.length > limit
    const events = hasMore ? rows.slice(0, limit) : rows

    res.json({
      events: events.map((row) => ({
        id: row.id,
        authUserId: row.authUserId,
        email: row.email,
        role: row.role,
        event: row.event,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: row.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? (events.at(-1)?.id ?? null) : null,
    })
  }),
)

// ---------------------------------------------------------------- read-only drill-down
//
// GET only, by design: no write route anywhere accepts another user's id, so an
// admin cannot alter a designer's data even by accident. Every handler filters
// on `:userId` through owner-scope, so pairing one user's id with another's row
// id 404s instead of leaking.

adminRouter.get(
  '/users/:userId/folders',
  asyncHandler(async (req, res) => {
    const folders = await prisma.folder.findMany({
      where: folderOwnedBy(req.params.userId),
      orderBy: { createdAt: 'asc' },
    })
    res.json(folders.map((folder) => ({ id: folder.id, name: folder.name })))
  }),
)

adminRouter.get(
  '/users/:userId/folders/:folderId/categories',
  asyncHandler(async (req, res) => {
    const categories = await prisma.category.findMany({
      where: { folderId: req.params.folderId, ...categoryOwnedBy(req.params.userId) },
      include: categoryInclude,
      orderBy: { createdAt: 'asc' },
    })
    res.json(categories.map(toCategoryDTO))
  }),
)

adminRouter.get(
  '/users/:userId/categories/:categoryId/clients',
  asyncHandler(async (req, res) => {
    const clients = await prisma.client.findMany({
      where: { categoryId: req.params.categoryId, ...clientOwnedBy(req.params.userId) },
      orderBy: { createdAt: 'asc' },
    })
    res.json(clients.map(toClientDTO))
  }),
)

adminRouter.get(
  '/users/:userId/clients/:clientId/revisions',
  asyncHandler(async (req, res) => {
    const revisions = await prisma.revision.findMany({
      where: { clientId: req.params.clientId, ...revisionOwnedBy(req.params.userId) },
      orderBy: { position: 'asc' },
    })
    res.json(revisions.map(toRevisionSummaryDTO))
  }),
)

adminRouter.get(
  '/users/:userId/revisions/:id',
  asyncHandler(async (req, res) => {
    const revision = await prisma.revision.findFirst({
      where: { id: req.params.id, ...revisionOwnedBy(req.params.userId) },
      include: revisionInclude,
    })
    if (!revision) return res.status(404).json({ error: 'Revision not found' })
    res.json(toRevisionDTO(revision))
  }),
)

adminRouter.get(
  '/users/:userId/revisions/:id/documents',
  asyncHandler(async (req, res) => {
    const revision = await prisma.revision.findFirst({
      where: { id: req.params.id, ...revisionOwnedBy(req.params.userId) },
      select: { id: true },
    })
    if (!revision) return res.status(404).json({ error: 'Revision not found' })

    const documents = await prisma.revisionDocument.findMany({
      where: { revisionId: revision.id, status: 'ready' },
      orderBy: { createdAt: 'asc' },
    })
    res.json(documents.map(toRevisionDocumentDTO))
  }),
)

// The one POST in this file, and still a read: signing a download URL writes
// nothing. It has to live on the server because storage RLS scopes objects to
// the *designer's* auth UID, so an admin's own token could never sign them.
//
// This does mean an admin can open a client's signed contract PDF. That is a
// deliberate decision, consistent with admins already reading the full quote,
// its pricing and the client's contact details.
adminRouter.post(
  '/users/:userId/documents/:id/download',
  asyncHandler(async (req, res) => {
    const document = await prisma.revisionDocument.findFirst({
      where: {
        id: req.params.id,
        status: 'ready',
        revision: revisionOwnedBy(req.params.userId),
      },
    })
    if (!document) return res.status(404).json({ error: 'Document not found' })

    try {
      const url = await createSignedDownloadUrl(document.storagePath, document.fileName)
      res.json({ url, expiresIn: 60 })
    } catch (error) {
      if (error instanceof SupabaseStorageUnavailableError) {
        return res.status(503).json({ error: error.message })
      }
      throw error
    }
  }),
)
