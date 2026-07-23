import { Fragment } from 'react'
import type { CompanyInfo, Quote } from '@/lib/mock-data'
import { formatMoney, getQuoteSummary, itemTotal } from '@/lib/quote-calculations'
import type { PaymentTerm } from '@/lib/settings-service'
import type { CurrentUser } from '@/lib/user-service'

interface Props {
  quote: Quote
  revisionLabel: string
  company: CompanyInfo
  user: CurrentUser
  gstRate: number
  currencySymbol: string
  paymentTermsSchedule: PaymentTerm[]
}

const TERMS = [
  {
    title: 'Quotation Validity',
    body: 'Quotation is valid for 30 days. Final pricing is subject to changes arising from variation works.',
  },
  {
    title: 'Payment Terms',
    body: 'Payment schedule shall follow the CaseTrust Standard Renovation Agreement. Specific milestone payments (if any) are reflected in the quotation.',
  },
  {
    title: 'Warranty',
    body: 'Workmanship warranty is as per CaseTrust Contract. Additional warranty coverage (if any) is stated in the quotation.',
  },
  {
    title: 'Material Disclaimer',
    body: 'Natural materials such as marble, granite, and timber may exhibit variations and are not considered defects.',
  },
  {
    title: 'Verbal Agreement',
    body: 'Only written terms and signed documents are binding. No verbal promises or agreements shall be recognized.',
  },
  {
    title: 'Payment Method',
    body: (companyName: string) =>
      `All payments must be made via cheque, cashier's order, or direct transfer to ${companyName}'s official bank account. Cash handed to staff or designers is not recognized and voids warranty.`,
  },
  {
    title: 'Termination & Cancellation',
    body: 'Cancellations and refunds shall be in accordance with the CaseTrust agreement. Charges may apply based on work completed.',
  },
] as const

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

const cell = 'border border-black px-2 py-1 align-top'

export function QuotePrintDocument({
  quote,
  revisionLabel,
  company,
  user,
  gstRate,
  currencySymbol,
  paymentTermsSchedule,
}: Props) {
  const summary = getQuoteSummary(quote, gstRate)
  const money = (value: number) => formatMoney(value, currencySymbol)

  return (
    <div className="bg-white font-sans text-[11px] text-black">
      <table className="w-full border-collapse">
        <tbody>
          <tr>
            <td className="w-40 border border-black px-2 py-1 text-center align-middle text-[10px] text-neutral-500">
              Company Logo
            </td>
            <td className="border border-black px-2 py-1 align-top">
              <p className="text-sm font-bold">{company.name}</p>
              <p>Address: {company.address}</p>
              <p>
                Tel: {company.tel} &nbsp; UEN: {company.uen} &nbsp; GST: {company.gst}
              </p>
              <p>Website: {company.website}</p>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="mt-2 w-full border-collapse">
        <tbody>
          <tr>
            <td className={`${cell} w-1/2`}>
              <p className="font-bold">Client</p>
              <p>Name: {quote.info.clientName}</p>
              <p>Email: {quote.info.email}</p>
              <p>Contact: {quote.info.contact}</p>
            </td>
            <td className={`${cell} w-1/2`}>
              <p className="font-bold">Project</p>
              <p>Quotation: {revisionLabel}</p>
              <p>REF: {quote.info.refNumber}</p>
              <p>Date: {quote.info.date}</p>
              <p>Designer: {quote.info.designer}</p>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="mt-2 w-full border-collapse">
        <thead>
          <tr className="bg-neutral-200">
            <th className={`${cell} w-14 text-left font-bold`}>No.</th>
            <th className={`${cell} text-left font-bold`}>Description</th>
            <th className={`${cell} w-24 text-right font-bold`}>Qty</th>
            <th className={`${cell} w-24 text-right font-bold`}>Amount</th>
          </tr>
        </thead>
        {summary.sections.length === 0 ? (
          <tbody>
            <tr>
              <td className={cell} colSpan={4}>
                No items included yet.
              </td>
            </tr>
          </tbody>
        ) : (
          summary.sections.map(({ section, areas }, sectionIndex) => {
            const sectionNumber = toLetter(sectionIndex)
            return (
              <tbody key={section.id} className="print-avoid-break">
                <tr className="bg-neutral-100">
                  <td className={`${cell} font-bold`}>{sectionNumber}.</td>
                  <td className={`${cell} font-bold`} colSpan={3}>
                    {section.name.replace('Section ', '')}
                    {section.description && <span className="font-normal"> — {section.description}</span>}
                  </td>
                </tr>
                {areas.map((area, areaIndex) => {
                  const areaNumber = `${sectionNumber}.${areaIndex + 1}`
                  return (
                    <Fragment key={area.id}>
                      <tr>
                        <td className={`${cell} font-medium`}>{areaNumber}</td>
                        <td className={`${cell} font-medium`} colSpan={3}>
                          {area.name}
                        </td>
                      </tr>
                      {area.items.map((item, itemIndex) => (
                        <tr key={item.id}>
                          <td className={cell}>
                            {areaNumber}.{itemIndex + 1}
                          </td>
                          <td className={cell}>{item.description}</td>
                          <td className={`${cell} text-right`}>
                            {item.qty} {item.unit}
                          </td>
                          <td className={`${cell} text-right`}>{money(itemTotal(item))}</td>
                        </tr>
                      ))}
                    </Fragment>
                  )
                })}
              </tbody>
            )
          })
        )}
        <tbody className="print-avoid-break">
          <tr>
            <td className={cell} colSpan={3}>
              <span className="font-bold">Sub Total</span>
            </td>
            <td className={`${cell} text-right font-bold`}>{money(summary.subTotal)}</td>
          </tr>
          <tr>
            <td className={cell} colSpan={3}>
              GST {(gstRate * 100).toFixed(0)}%
            </td>
            <td className={`${cell} text-right`}>{money(summary.gst)}</td>
          </tr>
          <tr className="bg-neutral-200">
            <td className={`${cell} font-bold`} colSpan={3}>
              Grand Total
            </td>
            <td className={`${cell} text-right font-bold`}>{money(summary.grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      <table className="print-avoid-break mt-2 w-full border-collapse">
        <thead>
          <tr className="bg-neutral-200">
            <th className={`${cell} w-10 text-left font-bold`}>No.</th>
            <th className={`${cell} text-left font-bold`}>Payment Terms & Schedule</th>
            <th className={`${cell} w-28 text-right font-bold`}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {paymentTermsSchedule.map((term, index) => (
            <tr key={term.label}>
              <td className={cell}>{index + 1}</td>
              <td className={cell}>{term.label}</td>
              <td className={`${cell} text-right`}>{money(summary.grandTotal * term.percent)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="print-avoid-break mt-2 w-full border-collapse">
        <tbody>
          <tr>
            <td className={cell}>
              <p className="mb-1 font-bold underline">Terms & Conditions</p>
              <ol className="flex list-decimal flex-col gap-1 pl-4">
                {TERMS.map((term) => (
                  <li key={term.title}>
                    <span className="font-bold">{term.title}:</span>{' '}
                    {typeof term.body === 'function' ? term.body(company.name) : term.body}
                  </li>
                ))}
              </ol>
              <p className="mt-2">
                We trust the above quotation is in order and we look forward to your soonest reply.
              </p>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="print-avoid-break mt-2 w-full border-collapse">
        <tbody>
          <tr>
            <td className={`${cell} w-1/2`}>
              <p>Yours Sincerely,</p>
              <div className="h-14" />
              <p>{user.name}</p>
              <p>Senior Designer</p>
              <p>{company.name}</p>
            </td>
            <td className={`${cell} w-1/2`}>
              <p>Confirmed and Accepted by</p>
              <div className="h-14" />
              <p>Name</p>
              <p>NRIC (Full IC)</p>
              <p>Date</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
