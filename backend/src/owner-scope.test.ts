import { describe, expect, it } from 'vitest'

import { categoryOwnedBy, clientOwnedBy, folderOwnedBy, revisionOwnedBy } from './owner-scope.js'

// Only Folder carries ownerId, so each level down the tree must add exactly one
// relation hop. A filter that is one hop short would silently match every row.
describe('owner-scope', () => {
  const ownerId = 'uid-1'

  it('filters folders on the column directly', () => {
    expect(folderOwnedBy(ownerId)).toEqual({ ownerId })
  })

  it('reaches Folder.ownerId from each level', () => {
    expect(categoryOwnedBy(ownerId)).toEqual({ folder: { ownerId } })
    expect(clientOwnedBy(ownerId)).toEqual({ category: { folder: { ownerId } } })
    expect(revisionOwnedBy(ownerId)).toEqual({ client: { category: { folder: { ownerId } } } })
  })

  it('builds each level from the one above, so depth cannot drift', () => {
    expect(clientOwnedBy(ownerId).category).toEqual(categoryOwnedBy(ownerId))
    expect(revisionOwnedBy(ownerId).client).toEqual(clientOwnedBy(ownerId))
  })
})
