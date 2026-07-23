import { useEffect, useRef, useState } from 'react'
import { formatSGDateTime } from '@/lib/date'
import * as masterTemplateService from '@/lib/master-template-service'
import type { Quote } from '@/lib/mock-data'
import { QuoteEditorLayout } from '@/pages/QuoteEditor/QuoteEditorLayout'

const REVISION = { id: 'r0', label: 'R0' }

export function MasterTemplateEditor() {
  const [masterTemplate, setMasterTemplate] = useState<masterTemplateService.MasterTemplate | null>(null)

  useEffect(() => {
    let cancelled = false
    masterTemplateService.getMasterTemplate().then((loaded) => {
      if (!cancelled) setMasterTemplate(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!masterTemplate) return <p className="text-sm text-muted-foreground">Loading...</p>

  return <MasterTemplateEditorInner initialQuote={masterTemplate.quote} initialUpdatedAt={masterTemplate.updatedAt} />
}

function MasterTemplateEditorInner({
  initialQuote,
  initialUpdatedAt,
}: {
  initialQuote: Quote
  initialUpdatedAt: string
}) {
  const [quote, setQuote] = useState(initialQuote)
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt)

  const saveRef = useRef(masterTemplateService.updateMasterTemplateQuote)
  useEffect(() => {
    const timeout = setTimeout(() => {
      saveRef.current(quote).then((saved) => setUpdatedAt(saved.updatedAt))
    }, 500)
    return () => clearTimeout(timeout)
  }, [quote])

  return (
    <QuoteEditorLayout
      breadcrumbItems={[{ label: 'Master Template' }]}
      revisions={[REVISION]}
      activeRevisionId={REVISION.id}
      onSelectRevision={() => {}}
      onAddRevision={() => {}}
      hideRevisions
      toolbarLeftExtra={
        <span className="text-sm text-muted-foreground">Last Updated: {formatSGDateTime(updatedAt)}</span>
      }
      quote={quote}
      onQuoteChange={setQuote}
    />
  )
}
