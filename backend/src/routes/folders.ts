import { Router } from 'express'
import { asyncHandler } from '../async-handler.js'
import { prisma } from '../db.js'
import { collectDocumentPaths, removeObjectsInBackground } from '../document-cleanup.js'
import { categoryOwnedBy } from '../owner-scope.js'
import { nameBodySchema } from '../schemas.js'
import type { FolderDTO } from '../types.js'

export const foldersRouter = Router()

function toFolderDTO(folder: { id: string; name: string }): FolderDTO {
  return { id: folder.id, name: folder.name }
}

foldersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const folders = await prisma.folder.findMany({
      where: { ownerId: req.authUserId },
      orderBy: { createdAt: 'asc' },
    })
    res.json(folders.map(toFolderDTO))
  }),
)

foldersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = nameBodySchema.parse(req.body)
    const folder = await prisma.folder.create({ data: { name: body.name, ownerId: req.authUserId } })
    res.status(201).json(toFolderDTO(folder))
  }),
)

foldersRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const body = nameBodySchema.parse(req.body)
    const { count } = await prisma.folder.updateMany({
      where: { id: req.params.id, ownerId: req.authUserId },
      data: { name: body.name },
    })
    if (count === 0) return res.status(404).json({ error: 'Folder not found' })
    res.json(toFolderDTO({ id: req.params.id, name: body.name }))
  }),
)

foldersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    // Collected before the delete: the cascade takes the document rows with it
    // and there is no trigger to catch them. See document-cleanup.ts.
    const documentPaths = await collectDocumentPaths({
      client: { category: { folderId: req.params.id, ...categoryOwnedBy(req.authUserId) } },
    })

    const { count } = await prisma.folder.deleteMany({ where: { id: req.params.id, ownerId: req.authUserId } })
    if (count === 0) return res.status(404).json({ error: 'Folder not found' })

    removeObjectsInBackground(documentPaths)
    res.status(204).end()
  }),
)
