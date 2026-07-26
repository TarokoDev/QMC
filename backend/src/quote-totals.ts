import type { LineItemDTO, QuoteDTO } from './types.js'

/**
 * Server-side quote totals, for the admin dashboard's value metrics.
 *
 * DELIBERATE DUPLICATE of `frontend/src/lib/quote-calculations.ts` — the same
 * rule, expressed twice, because the dashboard sums across many quotes on the
 * server while the editor computes one quote in the browser. `quote-totals.test.ts`
 * mirrors the frontend's cases so drift shows up as a failing test rather than
 * as a wrong number on a dashboard. Change one, change both.
 *
 * The inclusion chain (see docs/architecture.md): an item counts only if its
 * section is `complete`, its area is `included`, and the item itself is `inc`
 * and not `foc`.
 */

export function itemTotal(item: LineItemDTO): number {
  return item.foc || !item.inc ? 0 : item.qty * item.selling
}

export interface QuoteTotals {
  subTotal: number
  gst: number
  grandTotal: number
}

export function quoteTotals(quote: QuoteDTO, gstRate: number): QuoteTotals {
  const subTotal = quote.sections
    .filter((section) => section.complete)
    .flatMap((section) => section.areas.filter((area) => area.included))
    .flatMap((area) => area.items)
    .reduce((sum, item) => sum + itemTotal(item), 0)

  const gst = subTotal * gstRate
  return { subTotal, gst, grandTotal: subTotal + gst }
}

export function sumQuoteTotals(quotes: QuoteDTO[], gstRate: number): QuoteTotals {
  return quotes.reduce<QuoteTotals>(
    (acc, quote) => {
      const totals = quoteTotals(quote, gstRate)
      return {
        subTotal: acc.subTotal + totals.subTotal,
        gst: acc.gst + totals.gst,
        grandTotal: acc.grandTotal + totals.grandTotal,
      }
    },
    { subTotal: 0, gst: 0, grandTotal: 0 },
  )
}
