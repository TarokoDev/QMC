import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Breadcrumb, type BreadcrumbItem } from '@/components/Breadcrumb'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLocalStorageState } from '@/hooks/use-local-storage-state'
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
  onClientFieldChange?: (field: 'clientName' | 'email' | 'contact', value: string) => void
  onResetTemplate?: () => void
  onUseMasterTemplate?: () => void
  /**
   * Forces the whole editor into view-only mode, on top of the existing
   * "older revisions are frozen" rule. Used by the admin drill-down, where
   * there is no write endpoint behind any of these controls at all.
   */
  readOnly?: boolean
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
  onClientFieldChange,
  onResetTemplate,
  onUseMasterTemplate,
  readOnly = false,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('basic')
  const [tabRailCollapsed, setTabRailCollapsed] = useLocalStorageState('qms:tabRailCollapsed', false)
  const [showPreview, setShowPreview] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState(() => quote.sections[0]?.id ?? '')
  const [addRevisionOpen, setAddRevisionOpen] = useState(false)
  const [deletingRevision, setDeletingRevision] = useState<RevisionChip | null>(null)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [useMasterConfirmOpen, setUseMasterConfirmOpen] = useState(false)

  const activeSection = useMemo(
    () => quote.sections.find((section) => section.id === activeSectionId) ?? null,
    [quote.sections, activeSectionId],
  )

  useEffect(() => {
    if (!activeSection && quote.sections.length > 0) {
      setActiveSectionId(quote.sections[0].id)
    }
  }, [activeSection, quote.sections])

  const activeRevisionIndex = revisions.findIndex((revision) => revision.id === activeRevisionId)
  const activeRevisionLabel = revisions[activeRevisionIndex]?.label ?? ''
  const isLatestRevision = activeRevisionIndex === revisions.length - 1
  // Only the latest revision was ever editable; `readOnly` freezes the rest too.
  const fieldsReadOnly = readOnly || !isLatestRevision

  return (
    <div className="flex h-full flex-col">
      <Breadcrumb items={breadcrumbItems} />

      <div className="flex min-h-0 flex-1 gap-6">
        <div className={cn('flex shrink-0 flex-col gap-2', tabRailCollapsed ? 'w-12' : 'w-40')}>
          <Button
            variant="ghost"
            size={tabRailCollapsed ? 'icon' : 'sm'}
            aria-label={tabRailCollapsed ? 'Expand tabs' : 'Collapse tabs'}
            onClick={() => setTabRailCollapsed(!tabRailCollapsed)}
            className={tabRailCollapsed ? 'self-center' : 'justify-start self-stretch'}
          >
            {tabRailCollapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <>
                <ChevronLeft className="size-4" />
                Minimise
              </>
            )}
          </Button>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              title={tabRailCollapsed ? tab.label : undefined}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'rounded-lg border px-3 py-3 text-sm font-medium',
                tabRailCollapsed ? 'text-center' : 'text-left',
                tab.id === activeTab && 'bg-primary text-primary-foreground',
              )}
            >
              {tabRailCollapsed ? tab.label.charAt(0) : tab.label}
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
                  const canDelete = !readOnly && onDeleteRevision && index !== 0 && isLast
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
              {/* The one mutating control with no callback-shaped escape hatch,
                  so `readOnly` has to hide it explicitly. */}
              {!hideRevisions && !readOnly && (
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
            <div className="flex items-center gap-1.5">
              {isLatestRevision && onResetTemplate && (
                <Button variant="outline" onClick={() => setResetConfirmOpen(true)}>
                  Reset Template
                </Button>
              )}
              {isLatestRevision && onUseMasterTemplate && (
                <Button variant="outline" onClick={() => setUseMasterConfirmOpen(true)}>
                  Use Master Template
                </Button>
              )}
              {/* Hidden in admin view: QuotePreview stamps the *viewer's* name on
                  the signature block, which would be the admin, not the owner. */}
              {!readOnly && (
                <Button variant="outline" onClick={() => setShowPreview(true)}>
                  Preview Quote
                </Button>
              )}
            </div>
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
                readOnly={fieldsReadOnly}
                onClientFieldChange={onClientFieldChange}
              />
            )}
            {activeTab === 'items' && (
              <QuotationItemsTab
                quote={quote}
                onChange={onQuoteChange}
                activeSection={activeSection}
                activeSectionId={activeSectionId}
                onSelectSection={setActiveSectionId}
                readOnly={fieldsReadOnly}
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

      <ConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Reset template?"
        description="This clears all sections, areas of work, and line items in this revision back to blank. This cannot be undone."
        confirmLabel="Reset"
        destructive
        onConfirm={() => onResetTemplate?.()}
      />

      <ConfirmDialog
        open={useMasterConfirmOpen}
        onOpenChange={setUseMasterConfirmOpen}
        title="Use Master Template?"
        description="This replaces all sections, areas of work, and line items in this revision with the Master Template's current content. This cannot be undone."
        confirmLabel="Use Master Template"
        destructive
        onConfirm={() => onUseMasterTemplate?.()}
      />
    </div>
  )
}
