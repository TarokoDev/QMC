import { Fragment } from 'react'
import type { Quote } from '@/lib/mock-data'
import { formatMoney, getQuoteSummary, itemTotal } from '@/lib/quote-calculations'
import { useSettings } from '@/lib/settings-context'

interface Props {
  quote: Quote
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

export function SummaryTab({ quote }: Props) {
  const { gstRate, currencySymbol, paymentTermsSchedule } = useSettings()
  const summary = getQuoteSummary(quote, gstRate)
  const money = (value: number) => formatMoney(value, currencySymbol)

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto">
      <div>
        <p className="mb-2 text-sm font-medium">Selected Items</p>
        {summary.sections.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items included yet.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-16 border px-3 py-1.5 text-left font-medium">No.</th>
                <th className="border px-3 py-1.5 text-left font-medium">Description</th>
                <th className="w-28 border px-3 py-1.5 text-right font-medium">Qty</th>
                <th className="w-28 border px-3 py-1.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {summary.sections.map(({ section, areas }, sectionIndex) => {
                const sectionNumber = toLetter(sectionIndex)
                return (
                  <Fragment key={section.id}>
                    <tr className="bg-muted/25">
                      <td className="border px-3 py-1.5 align-top font-semibold">{sectionNumber}.</td>
                      <td colSpan={3} className="border px-3 py-1.5 font-semibold">
                        {section.name.replace('Section ', '')}
                        {section.description && (
                          <span className="font-normal text-muted-foreground"> — {section.description}</span>
                        )}
                      </td>
                    </tr>
                    {areas.map((area, areaIndex) => {
                      const areaNumber = `${sectionNumber}.${areaIndex + 1}`
                      return (
                        <Fragment key={area.id}>
                          <tr>
                            <td className="border px-3 py-1.5 align-top font-medium">{areaNumber}</td>
                            <td colSpan={3} className="border px-3 py-1.5 font-medium">
                              {area.name}
                            </td>
                          </tr>
                          {area.items.map((item, itemIndex) => (
                            <tr key={item.id}>
                              <td className="border px-3 py-1.5 align-top text-muted-foreground">
                                {areaNumber}.{itemIndex + 1}
                              </td>
                              <td className="border px-3 py-1.5">{item.description}</td>
                              <td className="border px-3 py-1.5 text-right">
                                {item.qty} {item.unit}
                              </td>
                              <td className="border px-3 py-1.5 text-right">{money(itemTotal(item))}</td>
                            </tr>
                          ))}
                        </Fragment>
                      )
                    })}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="ml-auto w-64 border-t pt-2 text-sm">
        <div className="flex justify-between py-1">
          <span>Sub Total</span>
          <span>{money(summary.subTotal)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span>GST {(gstRate * 100).toFixed(0)}%</span>
          <span>{money(summary.gst)}</span>
        </div>
        <div className="flex justify-between py-1 font-semibold">
          <span>Grand Total</span>
          <span>{money(summary.grandTotal)}</span>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Payment Terms & Schedule</p>
        <table className="w-full border-collapse text-sm">
          <tbody>
            {paymentTermsSchedule.map((term, index) => (
              <tr key={term.label}>
                <td className="w-12 border px-3 py-1.5 align-top tabular-nums">{index + 1}</td>
                <td className="border px-3 py-1.5 align-top text-muted-foreground">{term.label}</td>
                <td className="w-0 border px-3 py-1.5 align-top text-right font-medium tabular-nums whitespace-nowrap">
                  {money(summary.grandTotal * term.percent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
