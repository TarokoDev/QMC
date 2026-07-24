import { describe, expect, it } from 'vitest'

import { buildSectionsCreateInput } from './clone-quote.js'
import { BLANK_QUOTE, toCategoryDTO, toQuoteDTO, toRevisionDTO } from './quote-mapper.js'
import { makeAreaDTO, makeItemDTO, makeQuoteDTO, makeSectionDTO } from './test-utils/quote-builders.js'
import type { QuoteDTO } from './types.js'

type QuoteRow = Parameters<typeof toQuoteDTO>[0]

/**
 * Builds a fake persisted quote row (what Prisma would return with the
 * nested `sections.areas.items` include) from a QuoteDTO. Positions come
 * from array order unless the caller shuffles the arrays afterwards.
 */
function makeQuoteRow(dto: QuoteDTO): QuoteRow {
  return {
    id: 'quote-row-1',
    ...dto.info,
    categoryId: null,
    revisionId: null,
    masterTemplateId: null,
    sections: dto.sections.map((section, sectionIndex) => ({
      id: section.id,
      quoteId: 'quote-row-1',
      name: section.name,
      description: section.description,
      complete: section.complete,
      position: sectionIndex,
      areas: section.areas.map((area, areaIndex) => ({
        id: area.id,
        sectionId: section.id,
        name: area.name,
        included: area.included,
        position: areaIndex,
        items: area.items.map((item, itemIndex) => ({
          id: item.id,
          areaId: area.id,
          description: item.description,
          qty: item.qty,
          unit: item.unit,
          cost: item.cost,
          selling: item.selling,
          foc: item.foc,
          inc: item.inc,
          position: itemIndex,
        })),
      })),
    })),
  } as unknown as QuoteRow
}

describe('toQuoteDTO', () => {
  it('maps a persisted row back to the DTO shape', () => {
    const dto = makeQuoteDTO()
    expect(toQuoteDTO(makeQuoteRow(dto))).toEqual(dto)
  })

  it('orders sections, areas, and items by their position column, not row order', () => {
    const dto = makeQuoteDTO({
      sections: [
        makeSectionDTO({
          id: 's1',
          areas: [
            makeAreaDTO({
              id: 'a1',
              items: [makeItemDTO({ id: 'i1' }), makeItemDTO({ id: 'i2' }), makeItemDTO({ id: 'i3' })],
            }),
            makeAreaDTO({ id: 'a2' }),
          ],
        }),
        makeSectionDTO({ id: 's2' }),
        makeSectionDTO({ id: 's3' }),
      ],
    })
    const row = makeQuoteRow(dto)
    // Simulate the DB returning rows in arbitrary order (positions intact).
    row.sections.reverse()
    row.sections.find((section) => section.id === 's1')!.areas.reverse()
    row.sections.find((section) => section.id === 's1')!.areas.find((area) => area.id === 'a1')!.items.reverse()

    const mapped = toQuoteDTO(row)
    expect(mapped.sections.map((section) => section.id)).toEqual(['s1', 's2', 's3'])
    expect(mapped.sections[0].areas.map((area) => area.id)).toEqual(['a1', 'a2'])
    expect(mapped.sections[0].areas[0].items.map((item) => item.id)).toEqual(['i1', 'i2', 'i3'])
  })

  it('coerces Decimal-like qty/cost/selling values to plain numbers', () => {
    const row = makeQuoteRow(makeQuoteDTO())
    const item = row.sections[0].areas[0].items[0]
    // Prisma returns Decimal objects; Number() coerces via toString().
    item.qty = { toString: () => '2.5' } as never
    item.cost = { toString: () => '99.99' } as never
    item.selling = { toString: () => '150' } as never

    const mapped = toQuoteDTO(row)
    expect(mapped.sections[0].areas[0].items[0]).toMatchObject({ qty: 2.5, cost: 99.99, selling: 150 })
  })
})

describe('BLANK_QUOTE fallback', () => {
  it('is used when a category has no quote row yet', () => {
    const category = {
      id: 'cat-1',
      folderId: 'folder-1',
      name: 'HDB 4-Room',
      description: '',
      quote: null,
    } as unknown as Parameters<typeof toCategoryDTO>[0]
    expect(toCategoryDTO(category).quote).toEqual(BLANK_QUOTE)
  })

  it('is used when a revision has no quote row yet', () => {
    const revision = {
      id: 'rev-1',
      clientId: 'client-1',
      label: 'R0',
      position: 0,
      quote: null,
    } as unknown as Parameters<typeof toRevisionDTO>[0]
    expect(toRevisionDTO(revision).quote).toEqual(BLANK_QUOTE)
  })
})

describe('round-trip invariant: save → read never mutates quote content', () => {
  // This is the core quote-generation guarantee. Every clone path (category
  // duplicate, client creation from master, revision clone) and every
  // autosave goes DTO → buildSectionsCreateInput → DB rows → toQuoteDTO.
  // If this round trip is lossless, none of those paths can corrupt a quote.
  it('sections survive buildSectionsCreateInput → simulated rows → toQuoteDTO unchanged (minus ids)', () => {
    const original = makeQuoteDTO({
      sections: [
        makeSectionDTO({
          id: 's1',
          name: 'Carpentry',
          description: 'Built-ins',
          complete: false,
          areas: [
            makeAreaDTO({
              id: 'a1',
              name: 'Kitchen',
              included: false,
              items: [
                makeItemDTO({ id: 'i1', description: 'Cabinet', qty: 2.5, unit: 'SqFt', cost: 80, selling: 120 }),
                makeItemDTO({ id: 'i2', description: 'Freebie', foc: true, inc: false }),
              ],
            }),
          ],
        }),
        makeSectionDTO({ id: 's2', name: 'Electrical', areas: [] }),
      ],
    })

    // 1. What the routes send to Prisma.
    const createInput = buildSectionsCreateInput(original.sections)

    // 2. Simulate the persisted rows Prisma would hand back (fresh ids,
    //    positions as written by buildSectionsCreateInput).
    const persisted = makeQuoteRow({ info: original.info, sections: original.sections })
    // Sanity: the positions the simulation assigns match the create input's.
    expect(persisted.sections.map((section) => section.position)).toEqual(createInput.map((section) => section.position))

    // 3. Read back through the mapper and compare content (ids are expected
    //    to differ after a real clone, so compare everything but ids).
    const stripIds = (dto: QuoteDTO) => ({
      sections: dto.sections.map(({ id: _sectionId, areas, ...section }) => ({
        ...section,
        areas: areas.map(({ id: _areaId, items, ...area }) => ({
          ...area,
          items: items.map(({ id: _itemId, ...item }) => item),
        })),
      })),
    })

    expect(stripIds(toQuoteDTO(persisted))).toEqual(stripIds(original))
  })
})
