import { describe, expect, it } from 'vitest'

import type { CompanyInfo } from '@/lib/mock-data'
import { buildExcelRows, toLetter, type ExportParams } from '@/lib/quote-excel-export'
import { makeArea, makeItem, makeQuote, makeSection } from '@/test-utils/quote-builders'

const company: CompanyInfo = {
  name: 'Kimchinc Pte Ltd',
  address: '1 Test Ave',
  tel: '6123 4567',
  uen: 'UEN-123',
  gst: 'GST-123',
  website: 'kimchinc.example',
  logoDataUrl: null,
}

function makeParams(overrides: Partial<ExportParams> = {}): ExportParams {
  return {
    quote: makeQuote(),
    revisionLabel: 'R1',
    company,
    gstRate: 0.09,
    currencySymbol: 'S$',
    paymentTermsSchedule: [],
    ...overrides,
  }
}

describe('toLetter', () => {
  it('maps indices to spreadsheet-style letters', () => {
    expect(toLetter(0)).toBe('A')
    expect(toLetter(1)).toBe('B')
    expect(toLetter(25)).toBe('Z')
    expect(toLetter(26)).toBe('AA')
    expect(toLetter(27)).toBe('AB')
  })
})

describe('buildExcelRows', () => {
  it('starts with company name, client/revision, and REF/date header rows', () => {
    const rows = buildExcelRows(makeParams())
    expect(rows[0]).toEqual(['Kimchinc Pte Ltd'])
    expect(rows[1]).toEqual(['Client: Acme Renovations', '', 'Quotation: R1'])
    expect(rows[2]).toEqual(['REF: Q-001', '', 'Date: 2026-01-01'])
  })

  it('numbers sections A/B, areas A.1, and items A.1.1 from array position', () => {
    const quote = makeQuote({
      sections: [
        makeSection({
          id: 's1',
          areas: [
            makeArea({
              id: 'a1',
              name: 'Kitchen',
              items: [makeItem({ id: 'i1', description: 'Cabinet' }), makeItem({ id: 'i2', description: 'Sink' })],
            }),
          ],
        }),
        makeSection({ id: 's2', areas: [makeArea({ id: 'a2', name: 'Bedroom' })] }),
      ],
    })
    const rows = buildExcelRows(makeParams({ quote }))
    const numbering = rows.map((row) => row[0])
    expect(numbering).toContain('A.')
    expect(numbering).toContain('B.')
    expect(rows.find((row) => row[0] === 'A.1')?.[1]).toBe('Kitchen')
    expect(rows.find((row) => row[0] === 'A.1.1')?.[1]).toBe('Cabinet')
    expect(rows.find((row) => row[0] === 'A.1.2')?.[1]).toBe('Sink')
    expect(rows.find((row) => row[0] === 'B.1')?.[1]).toBe('Bedroom')
  })

  it('uses No. / Description / Qty / Unit / Unit Price / Amount headers with the currency in the header', () => {
    const rows = buildExcelRows(makeParams())
    expect(rows).toContainEqual(['No.', 'Description', 'Qty', 'Unit', 'Unit Price (S$)', 'Amount (S$)'])
  })

  it('renders the literal text FOC — not 0 — in the Amount column for FOC items', () => {
    const quote = makeQuote({
      sections: [makeSection({ areas: [makeArea({ items: [makeItem({ foc: true, selling: 50, description: 'Freebie' })] })] })],
    })
    const rows = buildExcelRows(makeParams({ quote }))
    const itemRow = rows.find((row) => row[1] === 'Freebie')
    expect(itemRow?.[4]).toBe(50)
    expect(itemRow?.[5]).toBe('FOC')
  })

  it('renders normal item amounts as numbers (qty × selling)', () => {
    const quote = makeQuote({
      sections: [makeSection({ areas: [makeArea({ items: [makeItem({ qty: 2, selling: 150, description: 'Wardrobe' })] })] })],
    })
    const rows = buildExcelRows(makeParams({ quote }))
    const itemRow = rows.find((row) => row[1] === 'Wardrobe')
    expect(itemRow?.[4]).toBe(150)
    expect(itemRow?.[5]).toBe(300)
  })

  it('omits unchecked items (inc = false) from the exported rows and renumbers around them', () => {
    const quote = makeQuote({
      sections: [
        makeSection({
          areas: [
            makeArea({
              items: [
                makeItem({ id: 'i1', inc: false, description: 'Skipped' }),
                makeItem({ id: 'i2', description: 'Kept', qty: 1, selling: 100 }),
              ],
            }),
          ],
        }),
      ],
    })
    const rows = buildExcelRows(makeParams({ quote }))
    expect(rows.find((row) => row[1] === 'Skipped')).toBeUndefined()
    // The kept item takes the first slot — numbering derives from position after filtering.
    expect(rows.find((row) => row[0] === 'A.1.1')?.[1]).toBe('Kept')
  })

  it('shows a placeholder row when nothing is included in the summary', () => {
    const quote = makeQuote({ sections: [makeSection({ complete: false })] })
    const rows = buildExcelRows(makeParams({ quote }))
    expect(rows).toContainEqual(['No items included yet.'])
  })

  it('appends Sub Total, GST with percent label, and Grand Total rows', () => {
    const quote = makeQuote({
      sections: [makeSection({ areas: [makeArea({ items: [makeItem({ qty: 1, selling: 1000 })] })] })],
    })
    const rows = buildExcelRows(makeParams({ quote }))
    expect(rows).toContainEqual(['', '', '', '', 'Sub Total', 1000])
    const gstRow = rows.find((row) => row[4] === 'GST 9%')
    expect(gstRow?.[5]).toBeCloseTo(90, 10)
    const grandRow = rows.find((row) => row[4] === 'Grand Total')
    expect(grandRow?.[5]).toBeCloseTo(1090, 10)
  })

  it('computes payment-term amounts as grandTotal × percent, as numbers rounded to 2 decimals', () => {
    const quote = makeQuote({
      sections: [makeSection({ areas: [makeArea({ items: [makeItem({ qty: 1, selling: 1000 })] })] })],
    })
    const rows = buildExcelRows(
      makeParams({
        quote,
        paymentTermsSchedule: [
          { label: 'Deposit', percent: 0.5 },
          { label: 'Completion', percent: 0.5 },
        ],
      }),
    )
    // Grand total = 1000 × 1.09 = 1090, split 50/50.
    expect(rows).toContainEqual([1, 'Deposit', 545])
    expect(rows).toContainEqual([2, 'Completion', 545])
  })
})
