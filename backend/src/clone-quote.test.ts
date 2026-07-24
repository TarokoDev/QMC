import { describe, expect, it } from 'vitest'

import { buildSectionsCreateInput } from './clone-quote.js'
import { makeAreaDTO, makeItemDTO, makeSectionDTO } from './test-utils/quote-builders.js'

describe('buildSectionsCreateInput', () => {
  it('returns an empty create input for no sections', () => {
    expect(buildSectionsCreateInput([])).toEqual([])
  })

  it('injects position from array index at section, area, and item level', () => {
    const input = buildSectionsCreateInput([
      makeSectionDTO({
        areas: [
          makeAreaDTO({ items: [makeItemDTO(), makeItemDTO({ id: 'item-2' })] }),
          makeAreaDTO({ id: 'area-2', items: [] }),
        ],
      }),
      makeSectionDTO({ id: 'sec-2', areas: [] }),
    ])

    expect(input.map((section) => section.position)).toEqual([0, 1])
    expect(input[0].areas.create.map((area) => area.position)).toEqual([0, 1])
    expect(input[0].areas.create[0].items.create.map((item) => item.position)).toEqual([0, 1])
  })

  it('copies content fields and flags exactly, but never the DTO ids (rows get fresh ids)', () => {
    const [section] = buildSectionsCreateInput([
      makeSectionDTO({
        name: 'Carpentry',
        description: 'Built-ins',
        complete: false,
        areas: [
          makeAreaDTO({
            name: 'Kitchen',
            included: false,
            items: [makeItemDTO({ description: 'Cabinet', qty: 2.5, unit: 'SqFt', cost: 80, selling: 120, foc: true, inc: false })],
          }),
        ],
      }),
    ])

    expect(section).toEqual({
      name: 'Carpentry',
      description: 'Built-ins',
      complete: false,
      position: 0,
      areas: {
        create: [
          {
            name: 'Kitchen',
            included: false,
            position: 0,
            items: {
              create: [
                {
                  description: 'Cabinet',
                  qty: 2.5,
                  unit: 'SqFt',
                  cost: 80,
                  selling: 120,
                  foc: true,
                  inc: false,
                  position: 0,
                },
              ],
            },
          },
        ],
      },
    })
  })
})
