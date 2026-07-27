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

  // Without the dirty guard the debounce fires on mount, rewriting the whole
  // template (and bumping "Last Updated") just for opening the page.
  const dirtyRef = useRef(false)

  const saveRef = useRef(masterTemplateService.updateMasterTemplateQuote)
  useEffect(() => {
    if (!dirtyRef.current) return
    const timeout = setTimeout(() => {
      dirtyRef.current = false
      saveRef.current(quote)
        .then((saved) => setUpdatedAt(saved.updatedAt))
        .catch((err) => console.error('Saving the master template failed:', err))
    }, 500)
    return () => clearTimeout(timeout)
  }, [quote])

  function handleQuoteChange(next: Quote) {
    dirtyRef.current = true
    setQuote(next)
  }

  return (
    <QuoteEditorLayout
      breadcrumbItems={[{ label: 'Master Template' }]}
      revisions={[REVISION]}
      activeRevisionId={REVISION.id}
      onSelectRevision={() => {}}
      onAddRevision={() => {}}
      hideRevisions
      canEditLogo
      toolbarLeftExtra={
        <span className="text-sm text-muted-foreground">Last Updated: {formatSGDateTime(updatedAt)}</span>
      }
      quote={quote}
      onQuoteChange={handleQuoteChange}
    />
  )
}
