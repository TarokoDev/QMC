import { Fragment } from 'react'
import type { Quote } from '@/lib/mock-data'
import {
  formatMoney,
  getQuoteSummary,
  itemProfitPercent,
  itemTotal,
  sectionTotals,
} from '@/lib/quote-calculations'
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
  const amount = (value: number) =>
    value.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const quoteTotals = summary.sections.reduce(
    (acc, { section }) => {
      const totals = sectionTotals(section)
      return {
        price: acc.price + totals.price,
        cost: acc.cost + totals.cost,
        profit: acc.profit + totals.profit,
      }
    },
    { price: 0, cost: 0, profit: 0 },
  )

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto">
      <div>
        <p className="mb-2 text-sm font-medium">Selected Items</p>
        {summary.sections.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items included yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="border px-3 py-1.5 text-left font-medium whitespace-nowrap">No.</th>
                  <th className="border px-3 py-1.5 text-left font-medium whitespace-nowrap">Description</th>
                  <th className="border px-3 py-1.5 text-right font-medium whitespace-nowrap">Qty</th>
                  <th className="border px-3 py-1.5 text-right font-medium whitespace-nowrap">Unit</th>
                  <th className="border px-3 py-1.5 text-right font-medium whitespace-nowrap">
                    Cost Price ({currencySymbol})
                  </th>
                  <th className="border px-3 py-1.5 text-right font-medium whitespace-nowrap">
                    Seller Price ({currencySymbol})
                  </th>
                  <th className="border px-3 py-1.5 text-right font-medium whitespace-nowrap">
                    Amount ({currencySymbol})
                  </th>
                  <th className="border px-3 py-1.5 text-right font-medium whitespace-nowrap">
                    Profit/Loss (%)
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.sections.map(({ section, areas }, sectionIndex) => {
                  const sectionNumber = toLetter(sectionIndex)
                  return (
                    <Fragment key={section.id}>
                      <tr className="bg-muted/25">
                        <td className="border px-3 py-1.5 align-top font-semibold whitespace-nowrap">
                          {sectionNumber}.
                        </td>
                        <td colSpan={7} className="border px-3 py-1.5 font-semibold">
                          {section.description}
                        </td>
                      </tr>
                      {areas.map((area, areaIndex) => {
                        const areaNumber = `${sectionNumber}.${areaIndex + 1}`
                        return (
                          <Fragment key={area.id}>
                            <tr>
                              <td className="border px-3 py-1.5 align-top font-medium whitespace-nowrap">
                                {areaNumber}
                              </td>
                              <td colSpan={7} className="border px-3 py-1.5 font-medium">
                                {area.name}
                              </td>
                            </tr>
                            {area.items.map((item, itemIndex) => (
                              <tr key={item.id}>
                                <td className="border px-3 py-1.5 align-top whitespace-nowrap text-muted-foreground">
                                  {areaNumber}.{itemIndex + 1}
                                </td>
                                <td className="border px-3 py-1.5">{item.description}</td>
                                <td className="border px-3 py-1.5 text-right whitespace-nowrap tabular-nums">
                                  {item.qty}
                                </td>
                                <td className="border px-3 py-1.5 text-right whitespace-nowrap">{item.unit}</td>
                                <td className="border px-3 py-1.5 text-right whitespace-nowrap tabular-nums">
                                  {amount(item.cost)}
                                </td>
                                <td className="border px-3 py-1.5 text-right whitespace-nowrap tabular-nums">
                                  {amount(item.selling)}
                                </td>
                                <td className="border px-3 py-1.5 text-right whitespace-nowrap tabular-nums">
                                  {item.foc ? 'FOC' : amount(itemTotal(item))}
                                </td>
                                <td className="border px-3 py-1.5 text-right whitespace-nowrap tabular-nums">
                                  {itemProfitPercent(item).toFixed(2)}
                                </td>
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
          </div>
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

      <div className="grid grid-cols-3 gap-4">
        <MetricBox label="Total Cost" value={quoteTotals.cost} currencySymbol={currencySymbol} />
        <MetricBox label="Total Price" value={quoteTotals.price} currencySymbol={currencySymbol} />
        <MetricBox
          label="Profit / Loss"
          value={quoteTotals.profit}
          currencySymbol={currencySymbol}
          percent={quoteTotals.cost === 0 ? 0 : (quoteTotals.profit / quoteTotals.cost) * 100}
        />
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

function MetricBox({
  label,
  value,
  currencySymbol,
  percent,
}: {
  label: string
  value: number
  currencySymbol: string
  percent?: number
}) {
  return (
    <div className="rounded-lg border px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold whitespace-nowrap">
        {formatMoney(value, currencySymbol)}
        {percent !== undefined ? ` (${percent.toFixed(2)}%)` : null}
      </p>
    </div>
  )
}
