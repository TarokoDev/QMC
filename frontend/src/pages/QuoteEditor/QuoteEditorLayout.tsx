import { Plus, Trash2 } from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'
import { Breadcrumb, type BreadcrumbItem } from '@/components/Breadcrumb'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Quote } from '@/lib/mock-data'
import { BasicInformationTab } from '@/pages/QuoteEditor/BasicInformationTab'
import { QuotationItemsTab } from '@/pages/QuoteEditor/QuotationItemsTab'
import { QuotePreview } from '@/pages/QuoteEditor/QuotePreview'
import { SummaryTab } from '@/pages/QuoteEditor/SummaryTab'

type TabId = 'basic' | 'items' | 'summary'

const TABS: { id: TabId; label: string }[] = [
  { id: 'basic', label: 'Basic Information' },
  { id: 'items', label: 'Quotation Items' },
  { id: 'summary', label: 'Summary' },
]

export interface RevisionChip {
  id: string
  label: string
}

interface Props {
  breadcrumbItems: BreadcrumbItem[]
  revisions: RevisionChip[]
  activeRevisionId: string
  onSelectRevision: (id: string) => void
  onAddRevision: () => void
  addRevisionDisabled?: boolean
  onDeleteRevision?: (id: string) => void
  hideRevisions?: boolean
  toolbarLeftExtra?: ReactNode
  quote: Quote
  onQuoteChange: (quote: Quote) => void
}

export function QuoteEditorLayout({
  breadcrumbItems,
  revisions,
  activeRevisionId,
  onSelectRevision,
  onAddRevision,
  addRevisionDisabled,
  onDeleteRevision,
  hideRevisions,
  toolbarLeftExtra,
  quote,
  onQuoteChange,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('basic')
  const [showPreview, setShowPreview] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState(() => quote.sections[0]?.id ?? '')
  const [addRevisionOpen, setAddRevisionOpen] = useState(false)
  const [deletingRevision, setDeletingRevision] = useState<RevisionChip | null>(null)

  const activeSection = useMemo(
    () => quote.sections.find((section) => section.id === activeSectionId) ?? null,
    [quote.sections, activeSectionId],
  )

  const activeRevisionIndex = revisions.findIndex((revision) => revision.id === activeRevisionId)
  const activeRevisionLabel = revisions[activeRevisionIndex]?.label ?? ''
  const isLatestRevision = activeRevisionIndex === revisions.length - 1

  return (
    <div className="flex h-full flex-col">
      <Breadcrumb items={breadcrumbItems} />

      <div className="flex min-h-0 flex-1 gap-6">
        <div className="flex w-56 shrink-0 flex-col gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'rounded-lg border px-4 py-3 text-left text-sm font-medium',
                tab.id === activeTab && 'bg-primary text-primary-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex items-center justify-between rounded-lg border px-4 py-2">
            <div className="flex items-center gap-1.5">
              {hideRevisions && toolbarLeftExtra}
              {!hideRevisions &&
                revisions.map((revision, index) => {
                  const isLast = index === revisions.length - 1
                  const isActive = revision.id === activeRevisionId
                  const canDelete = onDeleteRevision && index !== 0 && isLast
                  return (
                    <div key={revision.id} className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => onSelectRevision(revision.id)}
                        className={cn(
                          'flex items-center gap-1 rounded-md px-2.5 py-1 text-sm font-medium',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {revision.label}
                        {isLast && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'ml-1 h-4 px-1 text-[10px]',
                              isActive && 'border-primary-foreground/50 text-primary-foreground',
                            )}
                          >
                            Latest
                          </Badge>
                        )}
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          aria-label={`Delete ${revision.label}`}
                          onClick={() => setDeletingRevision(revision)}
                          className="rounded p-1 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}
              {!hideRevisions && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Add revision"
                  onClick={() => setAddRevisionOpen(true)}
                  disabled={addRevisionDisabled}
                >
                  <Plus className="size-4" />
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={() => setShowPreview(true)}>
              Preview Quote
            </Button>
          </div>

          <div
            className={cn(
              'min-h-0 flex-1 rounded-xl border p-6',
              activeTab === 'items' ? 'overflow-hidden' : 'overflow-y-auto',
            )}
          >
            {activeTab === 'basic' && (
              <BasicInformationTab
                quote={quote}
                onChange={onQuoteChange}
                revisionLabel={activeRevisionLabel}
                readOnly={!isLatestRevision}
              />
            )}
            {activeTab === 'items' && (
              <QuotationItemsTab
                quote={quote}
                onChange={onQuoteChange}
                activeSection={activeSection}
                activeSectionId={activeSectionId}
                onSelectSection={setActiveSectionId}
                readOnly={!isLatestRevision}
              />
            )}
            {activeTab === 'summary' && <SummaryTab quote={quote} />}
          </div>
        </div>

        {showPreview && (
          <QuotePreview
            quote={quote}
            revisionLabel={activeRevisionLabel}
            isLatest={isLatestRevision}
            onClose={() => setShowPreview(false)}
          />
        )}
      </div>

      <ConfirmDialog
        open={addRevisionOpen}
        onOpenChange={setAddRevisionOpen}
        title="Add a new revision?"
        description="You will no longer be able to edit previous revisions."
        confirmLabel="Add"
        onConfirm={onAddRevision}
      />

      <ConfirmDialog
        open={deletingRevision !== null}
        onOpenChange={(open) => !open && setDeletingRevision(null)}
        title={`Delete revision ${deletingRevision?.label}?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deletingRevision) onDeleteRevision?.(deletingRevision.id)
        }}
      />
    </div>
  )
}
