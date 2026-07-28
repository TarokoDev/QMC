import { describe, expect, it } from 'vitest'

import {
  areaOfWorkCount,
  formatMoney,
  getQuoteSummary,
  includedAreas,
  itemInclusionCount,
  itemProfitPercent,
  itemTotal,
  sectionTotals,
} from '@/lib/quote-calculations'
import { makeArea, makeItem, makeQuote, makeSection } from '@/test-utils/quote-builders'

// Singapore GST rate used across the app's seeded config.
const GST_RATE = 0.09

describe('itemTotal', () => {
  it('returns qty × selling for an included, non-FOC item', () => {
    expect(itemTotal(makeItem({ qty: 3, selling: 150 }))).toBe(450)
  })

  it('returns 0 for an FOC item — free of charge means no price contribution', () => {
    expect(itemTotal(makeItem({ foc: true, qty: 3, selling: 150 }))).toBe(0)
  })

  it('returns 0 for an unchecked item (inc = false)', () => {
    expect(itemTotal(makeItem({ inc: false, qty: 3, selling: 150 }))).toBe(0)
  })

  it('returns 0 when the item is both FOC and unchecked', () => {
    expect(itemTotal(makeItem({ foc: true, inc: false }))).toBe(0)
  })

  it('handles zero quantity', () => {
    expect(itemTotal(makeItem({ qty: 0 }))).toBe(0)
  })

  it('handles fractional quantities (e.g. 2.5 SqFt)', () => {
    expect(itemTotal(makeItem({ qty: 2.5, selling: 100, unit: 'SqFt' }))).toBe(250)
  })
})

describe('itemProfitPercent', () => {
  it('computes margin over cost: sell 150 on cost 100 = 50%', () => {
    expect(itemProfitPercent(makeItem({ cost: 100, selling: 150 }))).toBe(50)
  })

  it('returns 0 when cost is 0 instead of dividing by zero', () => {
    expect(itemProfitPercent(makeItem({ cost: 0, selling: 150 }))).toBe(0)
  })

  it('goes negative when selling below cost', () => {
    expect(itemProfitPercent(makeItem({ cost: 200, selling: 150 }))).toBe(-25)
  })
})

describe('includedAreas', () => {
  it('keeps only areas whose "included" checkbox is ticked', () => {
    const section = makeSection({
      areas: [
        makeArea({ id: 'a1', included: true }),
        makeArea({ id: 'a2', included: false }),
        makeArea({ id: 'a3', included: true }),
      ],
    })
    expect(includedAreas(section).map((area) => area.id)).toEqual(['a1', 'a3'])
  })

  it('returns an empty list for a section with no areas', () => {
    expect(includedAreas(makeSection({ areas: [] }))).toEqual([])
  })
})

describe('areaOfWorkCount', () => {
  it('counts areas with included = true against the total area count', () => {
    const section = makeSection({
      areas: [
        makeArea({ id: 'a1', included: true }),
        makeArea({ id: 'a2', included: false }),
        makeArea({ id: 'a3', included: true }),
      ],
    })
    expect(areaOfWorkCount(section)).toEqual({ included: 2, total: 3 })
  })

  it('returns 0/0 for a section with no areas', () => {
    expect(areaOfWorkCount(makeSection({ areas: [] }))).toEqual({ included: 0, total: 0 })
  })

  it('is not gated by section.complete — counts areas regardless', () => {
    const section = makeSection({ complete: false, areas: [makeArea({ included: true })] })
    expect(areaOfWorkCount(section)).toEqual({ included: 1, total: 1 })
  })
})

describe('itemInclusionCount', () => {
  it('counts items with inc = true against the total item count', () => {
    const area = makeArea({
      items: [
        makeItem({ id: 'i1', inc: true }),
        makeItem({ id: 'i2', inc: false }),
        makeItem({ id: 'i3', inc: true }),
      ],
    })
    expect(itemInclusionCount(area)).toEqual({ included: 2, total: 3 })
  })

  it('returns 0/0 for an area with no items', () => {
    expect(itemInclusionCount(makeArea({ items: [] }))).toEqual({ included: 0, total: 0 })
  })

  it('is not gated by area.included — counts items regardless', () => {
    const area = makeArea({ included: false, items: [makeItem({ inc: true })] })
    expect(itemInclusionCount(area)).toEqual({ included: 1, total: 1 })
  })
})

describe('sectionTotals', () => {
  it('sums price, cost, and profit across all included areas', () => {
    const section = makeSection({
      areas: [
        makeArea({ id: 'a1', items: [makeItem({ qty: 2, cost: 100, selling: 150 })] }),
        makeArea({ id: 'a2', items: [makeItem({ qty: 1, cost: 50, selling: 80 })] }),
      ],
    })
    expect(sectionTotals(section)).toEqual({ price: 380, cost: 250, profit: 130 })
  })

  // Per CLAUDE.md: an FOC item still has a real cost to the business —
  // that's the point of tracking it as a loss.
  it('FOC item counts toward cost but NOT price (tracked as a loss)', () => {
    const section = makeSection({
      areas: [makeArea({ items: [makeItem({ foc: true, qty: 1, cost: 100, selling: 150 })] })],
    })
    expect(sectionTotals(section)).toEqual({ price: 0, cost: 100, profit: -100 })
  })

  it('unchecked item (inc = false) counts toward neither price nor cost', () => {
    const section = makeSection({
      areas: [makeArea({ items: [makeItem({ inc: false, qty: 1, cost: 100, selling: 150 })] })],
    })
    expect(sectionTotals(section)).toEqual({ price: 0, cost: 0, profit: 0 })
  })

  it('ignores items inside non-included areas entirely', () => {
    const section = makeSection({
      areas: [makeArea({ included: false, items: [makeItem({ qty: 10, cost: 100, selling: 150 })] })],
    })
    expect(sectionTotals(section)).toEqual({ price: 0, cost: 0, profit: 0 })
  })
})

describe('getQuoteSummary', () => {
  // The three-tier gating (per CLAUDE.md): section "complete" checkbox →
  // area "included" checkbox → item "inc" checkbox. All must hold.

  it('excludes sections that are not marked complete', () => {
    const quote = makeQuote({
      sections: [makeSection({ complete: false, areas: [makeArea({ items: [makeItem({ selling: 999 })] })] })],
    })
    const summary = getQuoteSummary(quote, GST_RATE)
    expect(summary.sections).toEqual([])
    expect(summary.subTotal).toBe(0)
  })

  it('excludes complete sections whose areas are all un-included', () => {
    const quote = makeQuote({
      sections: [makeSection({ areas: [makeArea({ included: false })] })],
    })
    expect(getQuoteSummary(quote, GST_RATE).sections).toEqual([])
  })

  it('includes a complete section with at least one included area', () => {
    const quote = makeQuote({
      sections: [
        makeSection({
          id: 's1',
          areas: [makeArea({ id: 'a1', included: true }), makeArea({ id: 'a2', included: false })],
        }),
      ],
    })
    const summary = getQuoteSummary(quote, GST_RATE)
    expect(summary.sections).toHaveLength(1)
    // Non-included areas are stripped from the summary entry too.
    expect(summary.sections[0].areas.map((area) => area.id)).toEqual(['a1'])
  })

  it('computes subTotal, GST, and grand total for a multi-section quote', () => {
    const quote = makeQuote({
      sections: [
        makeSection({ id: 's1', areas: [makeArea({ items: [makeItem({ qty: 2, selling: 100 })] })] }),
        makeSection({ id: 's2', areas: [makeArea({ items: [makeItem({ qty: 1, selling: 300 })] })] }),
      ],
    })
    const summary = getQuoteSummary(quote, GST_RATE)
    expect(summary.subTotal).toBe(500)
    expect(summary.gst).toBeCloseTo(45, 10) // 500 × 9%
    expect(summary.grandTotal).toBeCloseTo(545, 10)
  })

  it('applies all three gates together: incomplete/un-included/unchecked all drop out', () => {
    const quote = makeQuote({
      sections: [
        // counted: 1 × 100
        makeSection({ id: 's1', areas: [makeArea({ items: [makeItem({ selling: 100 })] })] }),
        // section not complete → dropped
        makeSection({ id: 's2', complete: false, areas: [makeArea({ items: [makeItem({ selling: 100 })] })] }),
        // area not included → dropped
        makeSection({ id: 's3', areas: [makeArea({ included: false, items: [makeItem({ selling: 100 })] })] }),
        // item not checked → dropped, taking its now-empty area and section with it
        makeSection({ id: 's4', areas: [makeArea({ items: [makeItem({ inc: false, selling: 100 })] })] }),
      ],
    })
    const summary = getQuoteSummary(quote, GST_RATE)
    expect(summary.sections.map((entry) => entry.section.id)).toEqual(['s1'])
    expect(summary.subTotal).toBe(100)
  })

  it('strips unchecked items (inc = false) so they never reach the quotation output', () => {
    const quote = makeQuote({
      sections: [
        makeSection({
          areas: [
            makeArea({
              id: 'a1',
              items: [
                makeItem({ id: 'i1', inc: true, selling: 100 }),
                makeItem({ id: 'i2', inc: false, selling: 999 }),
              ],
            }),
          ],
        }),
      ],
    })
    const summary = getQuoteSummary(quote, GST_RATE)
    expect(summary.sections[0].areas[0].items.map((item) => item.id)).toEqual(['i1'])
    expect(summary.subTotal).toBe(100)
  })

  it('keeps FOC items on the quotation — free of charge is still shown, at zero price', () => {
    const quote = makeQuote({
      sections: [
        makeSection({
          areas: [makeArea({ items: [makeItem({ id: 'i1', foc: true, selling: 100 })] })],
        }),
      ],
    })
    const summary = getQuoteSummary(quote, GST_RATE)
    expect(summary.sections[0].areas[0].items.map((item) => item.id)).toEqual(['i1'])
    expect(summary.subTotal).toBe(0)
  })

  it('drops an area (and empty section) once every item in it is unchecked', () => {
    const quote = makeQuote({
      sections: [
        makeSection({
          areas: [makeArea({ items: [makeItem({ inc: false }), makeItem({ inc: false })] })],
        }),
      ],
    })
    expect(getQuoteSummary(quote, GST_RATE).sections).toEqual([])
  })

  it('returns zeros and no sections for an empty quote', () => {
    const summary = getQuoteSummary(makeQuote({ sections: [] }), GST_RATE)
    expect(summary).toEqual({ sections: [], subTotal: 0, gst: 0, grandTotal: 0 })
  })

  it('survives floating-point item math (0.1 qty × 0.2 selling)', () => {
    const quote = makeQuote({
      sections: [makeSection({ areas: [makeArea({ items: [makeItem({ qty: 0.1, selling: 0.2 })] })] })],
    })
    const summary = getQuoteSummary(quote, GST_RATE)
    expect(summary.subTotal).toBeCloseTo(0.02, 10)
    expect(summary.grandTotal).toBeCloseTo(0.0218, 10)
  })
})

describe('formatMoney', () => {
  it('formats with thousands grouping and exactly 2 decimals', () => {
    expect(formatMoney(1234.5, 'S$')).toBe('S$1,234.50')
  })

  it('pads whole numbers to 2 decimals', () => {
    expect(formatMoney(1000000, 'S$')).toBe('S$1,000,000.00')
  })

  it('keeps the symbol in front of negative values (loss display)', () => {
    expect(formatMoney(-100, 'S$')).toBe('S$-100.00')
  })

  it('uses whatever currency symbol the caller passes', () => {
    expect(formatMoney(50, '$')).toBe('$50.00')
  })

  it('rounds beyond 2 decimals rather than truncating', () => {
    expect(formatMoney(0.005, 'S$')).toBe('S$0.01')
    expect(formatMoney(1.239, 'S$')).toBe('S$1.24')
  })
})
