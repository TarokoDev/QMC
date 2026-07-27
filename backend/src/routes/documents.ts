import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { asyncHandler } from '../async-handler.js'
import { prisma } from '../db.js'
import { MAX_DOCUMENT_BYTES, buildStoragePath, sanitizeFileName } from '../document-path.js'
import {
  DOCUMENTS_BUCKET,
  SupabaseStorageUnavailableError,
  createSignedDownloadUrl,
  removeObjects,
  statObject,
} from '../document-storage.js'
import { revisionOwnedBy } from '../owner-scope.js'
import { toRevisionDocumentDTO } from '../quote-mapper.js'
import { createDocumentBodySchema } from '../schemas.js'
import type { DocumentDownloadDTO, DocumentUploadTicketDTO } from '../types.js'

/**
 * Files attached to a revision — the signed quote PDF, SketchUp models, site
 * photos. The bytes never pass through this API: the browser uploads straight
 * to Supabase Storage, and these routes hand out the key beforehand and verify
 * the object afterwards.
 *
 * The upload handshake is three steps on purpose:
 *
 *   POST /revisions/:id/documents  → row written as 'pending', key returned
 *   (browser PUTs the bytes to Storage)
 *   POST /documents/:id/confirm    → object verified, row flipped to 'ready'
 *
 * Writing the row first is what makes a failed upload harmless: an object can
 * never exist without a row pointing at it, so nothing is ever stranded
 * unnoticed. The reverse order would leak an untracked object on every dropped
 * connection.
 */
export const documentsRouter = Router()

/** How long a `pending` row is given to be confirmed before it is swept. */
const PENDING_TTL_MS = 60 * 60 * 1000

/**
 * Older revisions are frozen — they are the record of what a client was
 * actually sent, so their attachments stay readable but not editable. The
 * frontend hides the controls; this is what makes the rule true.
 */
async function isLatestRevision(revisionId: string, clientId: string): Promise<boolean> {
  const latest = await prisma.revision.findFirst({
    where: { clientId },
    orderBy: { position: 'desc' },
    select: { id: true },
  })
  return latest?.id === revisionId
}

/**
 * Clears rows whose upload never completed, plus any object they did manage to
 * write. Called opportunistically from the list route rather than on a timer:
 * there is no scheduler in this app, and the only place a stale row matters is
 * the listing it is already excluded from.
 */
async function sweepStalePendingDocuments(revisionId: string): Promise<void> {
  const stale = await prisma.revisionDocument.findMany({
    where: { revisionId, status: 'pending', createdAt: { lt: new Date(Date.now() - PENDING_TTL_MS) } },
    select: { id: true, storagePath: true },
  })
  if (stale.length === 0) return

  await prisma.revisionDocument.deleteMany({ where: { id: { in: stale.map((row) => row.id) } } })
  removeObjects(stale.map((row) => row.storagePath)).catch((error) => {
    console.error('Failed to sweep stale pending document objects:', error)
  })
}

documentsRouter.get(
  '/revisions/:id/documents',
  asyncHandler(async (req, res) => {
    const revision = await prisma.revision.findFirst({
      where: { id: req.params.id, ...revisionOwnedBy(req.authUserId) },
      select: { id: true },
    })
    if (!revision) return res.status(404).json({ error: 'Revision not found' })

    await sweepStalePendingDocuments(revision.id)

    const documents = await prisma.revisionDocument.findMany({
      where: { revisionId: revision.id, status: 'ready' },
      orderBy: { createdAt: 'asc' },
    })
    res.json(documents.map(toRevisionDocumentDTO))
  }),
)

documentsRouter.post(
  '/revisions/:id/documents',
  asyncHandler(async (req, res) => {
    const body = createDocumentBodySchema.parse(req.body)

    const revision = await prisma.revision.findFirst({
      where: { id: req.params.id, ...revisionOwnedBy(req.authUserId) },
      select: { id: true, clientId: true },
    })
    if (!revision) return res.status(404).json({ error: 'Revision not found' })
    if (!(await isLatestRevision(revision.id, revision.clientId))) {
      return res.status(403).json({ error: 'Only the latest revision accepts new documents' })
    }

    const id = randomUUID()
    const fileName = sanitizeFileName(body.fileName)
    // The owner segment comes from the verified JWT, never from Folder.ownerId
    // — that column is still nullable on pre-auth rows, and a `null/` prefix
    // would be rejected by the storage policy on upload.
    const storagePath = buildStoragePath(req.authUserId, revision.id, id, fileName)

    const document = await prisma.revisionDocument.create({
      data: {
        id,
        revisionId: revision.id,
        fileName,
        contentType: body.contentType,
        sizeBytes: body.sizeBytes,
        storagePath,
        status: 'pending',
        uploadedBy: req.authUserId,
      },
    })

    const ticket: DocumentUploadTicketDTO = {
      document: toRevisionDocumentDTO(document),
      bucket: DOCUMENTS_BUCKET,
      storagePath,
    }
    res.status(201).json(ticket)
  }),
)

documentsRouter.post(
  '/documents/:id/confirm',
  asyncHandler(async (req, res) => {
    const document = await prisma.revisionDocument.findFirst({
      where: { id: req.params.id, revision: revisionOwnedBy(req.authUserId) },
    })
    if (!document) return res.status(404).json({ error: 'Document not found' })

    let object: Awaited<ReturnType<typeof statObject>>
    try {
      object = await statObject(document.storagePath)
    } catch (error) {
      if (error instanceof SupabaseStorageUnavailableError) {
        return res.status(503).json({ error: error.message })
      }
      throw error
    }

    if (!object) {
      await prisma.revisionDocument.delete({ where: { id: document.id } })
      return res.status(409).json({ error: 'Upload did not complete' })
    }

    // The declared size was never trusted; this is the first look at the real
    // bytes, and the bucket's own limit is the layer that actually blocked them.
    if (object.size > MAX_DOCUMENT_BYTES) {
      await prisma.revisionDocument.delete({ where: { id: document.id } })
      removeObjects([document.storagePath]).catch((error) => {
        console.error('Failed to remove an oversized upload:', error)
      })
      return res.status(413).json({ error: 'File is larger than the 50 MB limit' })
    }

    const updated = await prisma.revisionDocument.update({
      where: { id: document.id },
      data: { status: 'ready', sizeBytes: object.size, contentType: object.contentType },
    })
    res.json(toRevisionDocumentDTO(updated))
  }),
)

// POST, not GET: this mints a short-lived credential rather than returning a
// resource, and it must never be cached or sit in a browser history entry.
documentsRouter.post(
  '/documents/:id/download',
  asyncHandler(async (req, res) => {
    const document = await prisma.revisionDocument.findFirst({
      where: { id: req.params.id, status: 'ready', revision: revisionOwnedBy(req.authUserId) },
    })
    if (!document) return res.status(404).json({ error: 'Document not found' })

    try {
      const url = await createSignedDownloadUrl(document.storagePath, document.fileName)
      const body: DocumentDownloadDTO = { url, expiresIn: 60 }
      res.json(body)
    } catch (error) {
      if (error instanceof SupabaseStorageUnavailableError) {
        return res.status(503).json({ error: error.message })
      }
      throw error
    }
  }),
)

documentsRouter.delete(
  '/documents/:id',
  asyncHandler(async (req, res) => {
    const document = await prisma.revisionDocument.findFirst({
      where: { id: req.params.id, revision: revisionOwnedBy(req.authUserId) },
      include: { revision: { select: { id: true, clientId: true } } },
    })
    if (!document) return res.status(404).json({ error: 'Document not found' })
    if (!(await isLatestRevision(document.revision.id, document.revision.clientId))) {
      return res.status(403).json({ error: 'Documents on earlier revisions cannot be deleted' })
    }

    // Object first: if storage fails, the row survives and the file is still
    // listed and still deletable. Deleting the row first would leave an object
    // nobody can see or reach.
    try {
      await removeObjects([document.storagePath])
    } catch (error) {
      if (error instanceof SupabaseStorageUnavailableError) {
        return res.status(503).json({ error: error.message })
      }
      throw error
    }

    await prisma.revisionDocument.delete({ where: { id: document.id } })
    res.status(204).end()
  }),
)
