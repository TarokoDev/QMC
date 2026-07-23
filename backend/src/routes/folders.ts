import { Router } from 'express'
import { asyncHandler } from '../async-handler.js'
import { prisma } from '../db.js'
import { nameBodySchema } from '../schemas.js'
import type { FolderDTO } from '../types.js'

export const foldersRouter = Router()

function toFolderDTO(folder: { id: string; name: string }): FolderDTO {
  return { id: folder.id, name: folder.name }
}

foldersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const folders = await prisma.folder.findMany({ orderBy: { createdAt: 'asc' } })
    res.json(folders.map(toFolderDTO))
  }),
)

foldersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = nameBodySchema.parse(req.body)
    const folder = await prisma.folder.create({ data: { name: body.name } })
    res.status(201).json(toFolderDTO(folder))
  }),
)

foldersRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const body = nameBodySchema.parse(req.body)
    const folder = await prisma.folder.update({ where: { id: req.params.id }, data: { name: body.name } })
    res.json(toFolderDTO(folder))
  }),
)

foldersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.folder.delete({ where: { id: req.params.id } })
    res.status(204).end()
  }),
)
