import { describe, expect, it } from 'vitest'

import { itemTotal, quoteTotals, sumQuoteTotals } from './quote-totals.js'
import type { AreaOfWorkDTO, LineItemDTO, QuoteDTO, QuoteSectionDTO } from './types.js'

// Mirrors frontend/src/lib/quote-calculations.test.ts. These two implementations
// are a deliberate duplicate (see quote-totals.ts) — if the rules ever diverge,
// this file is what catches it.

function item(overrides: Partial<LineItemDTO> = {}): LineItemDTO {
  return { id: 'i', description: '', qty: 2, unit: 'Lot', cost: 100, selling: 250, foc: false, inc: true, ...overrides }
}

function area(items: LineItemDTO[], included = true): AreaOfWorkDTO {
  return { id: 'a', name: 'Area', included, items }
}

function section(areas: AreaOfWorkDTO[], complete = true): QuoteSectionDTO {
  return { id: 's', name: 'Section', description: '', complete, areas }
}

function quote(sections: QuoteSectionDTO[]): QuoteDTO {
  return {
    info: {
      clientName: '',
      projectSite: '',
      email: '',
      contact: '',
      quotationRef: 'R0',
      refNumber: '',
      date: '',
      designer: '',
    },
    sections,
  }
}

describe('itemTotal', () => {
  it('multiplies qty by selling price', () => {
    expect(itemTotal(item({ qty: 3, selling: 150 }))).toBe(450)
  })

  it('zeroes a FOC item — a freebie is charged at nothing', () => {
    expect(itemTotal(item({ foc: true }))).toBe(0)
  })

  it('zeroes an excluded item', () => {
    expect(itemTotal(item({ inc: false }))).toBe(0)
  })
})

describe('quoteTotals', () => {
  it('applies GST on top of the sub total', () => {
    const totals = quoteTotals(quote([section([area([item({ qty: 1, selling: 1000 })])])]), 0.09)
    expect(totals).toEqual({ subTotal: 1000, gst: 90, grandTotal: 1090 })
  })

  // The three gates that decide whether anything counts at all, per
  // docs/architecture.md: section.complete → area.included → item.inc/foc.
  it('ignores sections that are not marked complete', () => {
    const incomplete = quote([section([area([item({ qty: 1, selling: 500 })])], false)])
    expect(quoteTotals(incomplete, 0.09).subTotal).toBe(0)
  })

  it('ignores areas that are not included', () => {
    const excluded = quote([section([area([item({ qty: 1, selling: 500 })], false)])])
    expect(quoteTotals(excluded, 0.09).subTotal).toBe(0)
  })

  it('counts only the included areas of a complete section', () => {
    const mixed = quote([
      section([area([item({ qty: 1, selling: 300 })]), area([item({ qty: 1, selling: 700 })], false)]),
    ])
    expect(quoteTotals(mixed, 0).subTotal).toBe(300)
  })

  it('is zero for an empty quote rather than NaN', () => {
    expect(quoteTotals(quote([]), 0.09)).toEqual({ subTotal: 0, gst: 0, grandTotal: 0 })
  })
})

describe('sumQuoteTotals', () => {
  it('adds up several quotes', () => {
    const one = quote([section([area([item({ qty: 1, selling: 100 })])])])
    const two = quote([section([area([item({ qty: 2, selling: 100 })])])])
    expect(sumQuoteTotals([one, two], 0.09)).toEqual({ subTotal: 300, gst: 27, grandTotal: 327 })
  })

  it('returns zeroes for no quotes at all', () => {
    expect(sumQuoteTotals([], 0.09)).toEqual({ subTotal: 0, gst: 0, grandTotal: 0 })
  })
})
