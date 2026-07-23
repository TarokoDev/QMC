import { createPortal } from 'react-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Quote } from '@/lib/mock-data'
import { useCurrentUser } from '@/lib/auth-context'
import { exportQuoteToExcel } from '@/lib/quote-excel-export'
import { useSettings } from '@/lib/settings-context'
import { QuotePrintDocument } from '@/pages/QuoteEditor/QuotePrintDocument'

interface Props {
  quote: Quote
  revisionLabel: string
  isLatest: boolean
  onClose: () => void
}

export function QuotePreview({ quote, revisionLabel, isLatest, onClose }: Props) {
  const { company, gstRate, currencySymbol, paymentTermsSchedule } = useSettings()
  const user = useCurrentUser()

  const printDoc = (
    <QuotePrintDocument
      quote={quote}
      revisionLabel={revisionLabel}
      company={company}
      user={user}
      gstRate={gstRate}
      currencySymbol={currencySymbol}
      paymentTermsSchedule={paymentTermsSchedule}
    />
  )

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Quote Preview</h2>
            <Badge variant="outline">{revisionLabel}</Badge>
            {isLatest && <Badge>Latest</Badge>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              Download PDF
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                exportQuoteToExcel({ quote, revisionLabel, company, gstRate, currencySymbol, paymentTermsSchedule })
              }
            >
              Download Excel
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="rounded-xl border p-4">{printDoc}</div>
      </div>

      {createPortal(<div id="quote-print-area">{printDoc}</div>, window.document.body)}
    </div>
  )
}
