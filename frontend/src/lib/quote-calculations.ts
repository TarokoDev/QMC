import type { AreaOfWork, LineItem, Quote, QuoteSection } from '@/lib/mock-data'

// `itemTotal` and the sub-total rule here are mirrored server-side in
// `backend/src/quote-totals.ts` (the admin dashboard sums quote values across
// many quotes at once). Change one, change both — `quote-totals.test.ts`
// mirrors these cases so drift fails a test.

export function formatMoney(value: number, currencySymbol: string) {
  return `${currencySymbol}${value.toLocaleString('en-SG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function itemTotal(item: LineItem) {
  return item.foc || !item.inc ? 0 : item.qty * item.selling
}

export function itemProfitPercent(item: LineItem) {
  if (item.cost === 0) return 0
  return ((item.selling - item.cost) / item.cost) * 100
}

export function includedAreas(section: QuoteSection): AreaOfWork[] {
  return section.areas.filter((area) => area.included)
}

export function areaOfWorkCount(section: QuoteSection) {
  return { included: section.areas.filter((area) => area.included).length, total: section.areas.length }
}

export function itemInclusionCount(area: AreaOfWork) {
  return { included: area.items.filter((item) => item.inc).length, total: area.items.length }
}

export function sectionTotals(section: QuoteSection) {
  const items = includedAreas(section).flatMap((area) => area.items)
  const price = items.reduce((sum, item) => sum + itemTotal(item), 0)
  const cost = items.reduce((sum, item) => sum + (item.inc ? item.qty * item.cost : 0), 0)
  return { price, cost, profit: price - cost }
}

export interface QuoteSummary {
  sections: { section: QuoteSection; areas: AreaOfWork[] }[]
  subTotal: number
  gst: number
  grandTotal: number
}

export function getQuoteSummary(quote: Quote, gstRate: number): QuoteSummary {
  const sections = quote.sections
    .filter((section) => section.complete)
    .map((section) => ({
      section,
      areas: includedAreas(section)
        .map((area) => ({ ...area, items: area.items.filter((item) => item.inc) }))
        .filter((area) => area.items.length > 0),
    }))
    .filter((entry) => entry.areas.length > 0)

  const subTotal = sections.reduce(
    (sum, entry) =>
      sum + entry.areas.reduce((areaSum, area) => areaSum + area.items.reduce((itemSum, item) => itemSum + itemTotal(item), 0), 0),
    0,
  )
  const gst = subTotal * gstRate
  const grandTotal = subTotal + gst

  return { sections, subTotal, gst, grandTotal }
}
