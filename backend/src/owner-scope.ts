/**
 * One definition of "owned by", parameterised by Supabase auth UID.
 *
 * Only `Folder` carries `ownerId` (schema.prisma) — everything below inherits
 * ownership through the relation chain, so each level adds one hop. These were
 * written inline at ~20 call sites; centralising them means a future change to
 * the tree's depth cannot leave the owner routes and the admin read routes
 * disagreeing about who owns what.
 *
 * Owner routes pass `req.authUserId`; admin read routes pass the `:userId`
 * path param. Nothing else may supply an owner id.
 */

export const folderOwnedBy = (ownerId: string) => ({ ownerId })

export const categoryOwnedBy = (ownerId: string) => ({ folder: folderOwnedBy(ownerId) })

export const clientOwnedBy = (ownerId: string) => ({ category: categoryOwnedBy(ownerId) })

export const revisionOwnedBy = (ownerId: string) => ({ client: clientOwnedBy(ownerId) })
