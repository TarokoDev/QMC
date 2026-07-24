import * as XLSX from 'xlsx'
import type { CompanyInfo, Quote } from '@/lib/mock-data'
import { getQuoteSummary, itemTotal } from '@/lib/quote-calculations'
import type { PaymentTerm } from '@/lib/settings-service'

interface ExportParams {
  quote: Quote
  revisionLabel: string
  company: CompanyInfo
  gstRate: number
  currencySymbol: string
  paymentTermsSchedule: PaymentTerm[]
}

/** 0 -> "A", 25 -> "Z", 26 -> "AA", ... */
function toLetter(index: number): string {
  let n = index
  let label = ''
  do {
    label = String.fromCharCode(65 + (n % 26)) + label
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return label
}

export function exportQuoteToExcel({
  quote,
  revisionLabel,
  company,
  gstRate,
  currencySymbol,
  paymentTermsSchedule,
}: ExportParams) {
  const summary = getQuoteSummary(quote, gstRate)
  const money = (value: number) => `${currencySymbol}${value.toFixed(2)}`

  const rows: (string | number)[][] = []

  rows.push([company.name])
  rows.push([`Client: ${quote.info.clientName}`, '', `Quotation: ${revisionLabel}`])
  rows.push([`REF: ${quote.info.refNumber}`, '', `Date: ${quote.info.date}`])
  rows.push([])

  rows.push(['No.', 'Description', 'Qty', 'Unit', 'Amount'])

  if (summary.sections.length === 0) {
    rows.push(['No items included yet.'])
  } else {
    summary.sections.forEach(({ areas }, sectionIndex) => {
      const sectionNumber = toLetter(sectionIndex)
      rows.push([`${sectionNumber}.`, sectionNumber])
      areas.forEach((area, areaIndex) => {
        const areaNumber = `${sectionNumber}.${areaIndex + 1}`
        rows.push([areaNumber, area.name])
        area.items.forEach((item, itemIndex) => {
          rows.push([
            `${areaNumber}.${itemIndex + 1}`,
            item.description,
            item.qty,
            item.unit,
            item.foc ? 'FOC' : itemTotal(item),
          ])
        })
      })
    })
  }

  rows.push([])
  rows.push(['', '', '', 'Sub Total', summary.subTotal])
  rows.push(['', '', '', `GST ${(gstRate * 100).toFixed(0)}%`, summary.gst])
  rows.push(['', '', '', 'Grand Total', summary.grandTotal])
  rows.push([])

  rows.push(['No.', 'Payment Terms & Schedule', 'Amount'])
  paymentTermsSchedule.forEach((term, index) => {
    rows.push([index + 1, term.label, money(summary.grandTotal * term.percent)])
  })

  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  worksheet['!cols'] = [{ wch: 10 }, { wch: 40 }, { wch: 10 }, { wch: 12 }, { wch: 14 }]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Quote')

  XLSX.writeFile(workbook, `${quote.info.refNumber || 'quote'}-${revisionLabel}.xlsx`)
}
