import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useLocalStorageState } from '@/hooks/use-local-storage-state'
import { cn } from '@/lib/utils'
import type { AreaOfWork, LineItem, Quote, QuoteSection, Unit } from '@/lib/mock-data'
import { formatMoney, itemProfitPercent, itemTotal, sectionTotals } from '@/lib/quote-calculations'
import { useSettings } from '@/lib/settings-context'

interface Props {
  quote: Quote
  onChange: (quote: Quote) => void
  activeSection: QuoteSection | null
  activeSectionId: string
  onSelectSection: (sectionId: string) => void
  readOnly?: boolean
}

let idCounter = 0
function nextId(prefix: string) {
  idCounter += 1
  return `${prefix}-${idCounter}`
}

function sectionLabel(index: number) {
  return `Section ${String.fromCharCode(65 + index)}`
}

export function QuotationItemsTab({
  quote,
  onChange,
  activeSection,
  activeSectionId,
  onSelectSection,
  readOnly,
}: Props) {
  const { unitOptions, currencySymbol } = useSettings()
  const money = (value: number) => formatMoney(value, currencySymbol)
  const sectionIndex = quote.sections.findIndex((section) => section.id === activeSectionId)
  const sectionLetter = String.fromCharCode(65 + Math.max(sectionIndex, 0))
  const activeSectionLabel = sectionLabel(Math.max(sectionIndex, 0))
  const [deletingArea, setDeletingArea] = useState<{ sectionId: string; areaId: string; label: string } | null>(null)
  const [deletingSection, setDeletingSection] = useState<{ id: string; name: string } | null>(null)
  const [sectionsCollapsed, setSectionsCollapsed] = useLocalStorageState('qms:sectionsSidebarCollapsed', false)

  function updateSection(sectionId: string, updater: (section: QuoteSection) => QuoteSection) {
    onChange({
      ...quote,
      sections: quote.sections.map((section) => (section.id === sectionId ? updater(section) : section)),
    })
  }

  function updateArea(sectionId: string, areaId: string, updater: (area: AreaOfWork) => AreaOfWork) {
    updateSection(sectionId, (section) => ({
      ...section,
      areas: section.areas.map((area) => (area.id === areaId ? updater(area) : area)),
    }))
  }

  function updateItem(sectionId: string, areaId: string, itemId: string, updater: (item: LineItem) => LineItem) {
    updateArea(sectionId, areaId, (area) => ({
      ...area,
      items: area.items.map((item) => (item.id === itemId ? updater(item) : item)),
    }))
  }

  function addSection() {
    const newSection: QuoteSection = {
      id: nextId('section'),
      name: 'Section',
      description: 'New Section',
      complete: false,
      areas: [],
    }
    onChange({ ...quote, sections: [...quote.sections, newSection] })
    onSelectSection(newSection.id)
  }

  function deleteSection(sectionId: string) {
    const remaining = quote.sections.filter((section) => section.id !== sectionId)
    onChange({ ...quote, sections: remaining })
    if (activeSectionId === sectionId) {
      onSelectSection(remaining[0]?.id ?? '')
    }
  }

  function addArea(sectionId: string) {
    updateSection(sectionId, (section) => ({
      ...section,
      areas: [...section.areas, { id: nextId('area'), name: 'New Area of Work', included: false, items: [] }],
    }))
  }

  function deleteArea(sectionId: string, areaId: string) {
    updateSection(sectionId, (section) => ({
      ...section,
      areas: section.areas.filter((area) => area.id !== areaId),
    }))
  }

  function addItem(sectionId: string, areaId: string) {
    updateArea(sectionId, areaId, (area) => ({
      ...area,
      items: [
        ...area.items,
        {
          id: nextId('item'),
          description: 'New Item',
          qty: 1,
          unit: 'Lot' as Unit,
          cost: 0,
          selling: 0,
          foc: false,
          inc: true,
        },
      ],
    }))
  }

  function deleteItem(sectionId: string, areaId: string, itemId: string) {
    updateArea(sectionId, areaId, (area) => ({
      ...area,
      items: area.items.filter((item) => item.id !== itemId),
    }))
  }

  return (
    <div className="flex h-full min-h-0 gap-6">
      <div
        className={cn(
          'flex h-full shrink-0 flex-col rounded-xl border bg-primary/10',
          sectionsCollapsed ? 'w-12' : 'w-56',
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          aria-label={sectionsCollapsed ? 'Expand sections' : 'Collapse sections'}
          onClick={() => setSectionsCollapsed(!sectionsCollapsed)}
          className="m-1 shrink-0 self-end"
        >
          {sectionsCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </Button>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 pt-0">
          {quote.sections.map((section, sectionListIndex) =>
            sectionsCollapsed ? (
              <button
                key={section.id}
                type="button"
                title={sectionLabel(sectionListIndex)}
                onClick={() => onSelectSection(section.id)}
                className={cn(
                  'flex items-center justify-center rounded-lg border bg-background py-2 text-sm font-medium',
                  section.id === activeSectionId && 'ring-2 ring-primary',
                )}
              >
                {String.fromCharCode(65 + sectionListIndex)}
              </button>
            ) : (
              <button
                key={section.id}
                type="button"
                onClick={() => onSelectSection(section.id)}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-left',
                  section.id === activeSectionId && 'ring-2 ring-primary',
                )}
              >
                <span>
                  <span className="block text-sm font-medium">{sectionLabel(sectionListIndex)}</span>
                  <span className="block text-xs text-muted-foreground">{section.description}</span>
                </span>
                <span className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Delete section"
                    disabled={readOnly}
                    className="shrink-0 rounded p-1 text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeletingSection({ id: section.id, name: sectionLabel(sectionListIndex) })
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                  <Checkbox
                    checked={section.complete}
                    disabled={readOnly}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={(checked) => updateSection(section.id, (s) => ({ ...s, complete: checked === true }))}
                  />
                </span>
              </button>
            ),
          )}
        </div>
        <button
          type="button"
          onClick={addSection}
          disabled={readOnly}
          title={sectionsCollapsed ? 'Add new section' : undefined}
          className="shrink-0 rounded-b-xl border-t bg-background py-3 text-center text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
        >
          {sectionsCollapsed ? <Plus className="mx-auto size-4" /> : 'Add new section'}
        </button>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {!activeSection ? (
          <p className="text-sm text-muted-foreground">Select a section to view items.</p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="flex shrink-0 items-start border-b pb-2">
              <div>
                <p className="text-sm font-medium">{activeSectionLabel}</p>
                <Textarea
                  value={activeSection.description}
                  onChange={(e) =>
                    updateSection(activeSection.id, (s) => ({ ...s, description: e.target.value }))
                  }
                  disabled={readOnly}
                  className="mt-1 max-w-xs"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
              <Accordion type="single" collapsible className="w-full">
                {activeSection.areas.map((area, areaIndex) => (
                  <AccordionItem key={area.id} value={area.id}>
                    <div className="flex items-center gap-2 bg-muted/30 px-2 py-1.5 text-sm">
                      <span className="w-8 shrink-0 font-medium text-muted-foreground">
                        {sectionLetter}.{areaIndex + 1}
                      </span>
                      <Input
                        value={area.name}
                        onChange={(e) =>
                          updateArea(activeSection.id, area.id, (a) => ({ ...a, name: e.target.value }))
                        }
                        disabled={readOnly}
                        className="max-w-64"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Checkbox
                        checked={area.included}
                        disabled={readOnly}
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={(checked) =>
                          updateArea(activeSection.id, area.id, (a) => ({ ...a, included: checked === true }))
                        }
                      />
                      <div className="flex flex-1 items-center justify-end gap-1">
                        <AccordionTrigger className="flex-none justify-end" />
                        <button
                          type="button"
                          aria-label="Delete area of work"
                          disabled={readOnly}
                          className="shrink-0 rounded p-1 text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeletingArea({ sectionId: activeSection.id, areaId: area.id, label: `${sectionLetter}.${areaIndex + 1} ${area.name}` })
                          }}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                    <AccordionContent>
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-muted-foreground">
                            <th className="w-8 px-2 py-1">#</th>
                            <th className="px-2 py-1">Item Description</th>
                            <th className="w-24 px-2 py-1">Qty</th>
                            <th className="w-24 px-2 py-1">Unit</th>
                            <th className="w-24 px-2 py-1">Cost (S$)</th>
                            <th className="w-24 px-2 py-1">Selling (S$)</th>
                            <th className="w-20 px-2 py-1">Total (S$)</th>
                            <th className="w-16 px-2 py-1">P/L (%)</th>
                            <th className="w-12 px-2 py-1">FOC</th>
                            <th className="w-12 px-2 py-1">INC.</th>
                            <th className="w-8 px-2 py-1" />
                          </tr>
                        </thead>
                        <tbody>
                          {area.items.map((item, index) => (
                            <tr key={item.id} className="border-t">
                              <td className="px-2 py-1.5">{index + 1}</td>
                              <td className="px-2 py-1.5">
                                <Textarea
                                  value={item.description}
                                  disabled={readOnly}
                                  onChange={(e) =>
                                    updateItem(activeSection.id, area.id, item.id, (i) => ({
                                      ...i,
                                      description: e.target.value,
                                    }))
                                  }
                                  className="min-h-0 py-1"
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <Input
                                  type="number"
                                  value={item.qty}
                                  disabled={readOnly}
                                  onChange={(e) =>
                                    updateItem(activeSection.id, area.id, item.id, (i) => ({
                                      ...i,
                                      qty: Number(e.target.value),
                                    }))
                                  }
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <Select
                                  value={item.unit}
                                  disabled={readOnly}
                                  onValueChange={(value) =>
                                    updateItem(activeSection.id, area.id, item.id, (i) => ({
                                      ...i,
                                      unit: value as Unit,
                                    }))
                                  }
                                >
                                  <SelectTrigger size="sm" className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {unitOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.value}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-2 py-1.5">
                                <Input
                                  type="number"
                                  value={item.cost}
                                  disabled={readOnly}
                                  onChange={(e) =>
                                    updateItem(activeSection.id, area.id, item.id, (i) => ({
                                      ...i,
                                      cost: Number(e.target.value),
                                    }))
                                  }
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <Input
                                  type="number"
                                  value={item.selling}
                                  disabled={readOnly}
                                  onChange={(e) =>
                                    updateItem(activeSection.id, area.id, item.id, (i) => ({
                                      ...i,
                                      selling: Number(e.target.value),
                                    }))
                                  }
                                />
                              </td>
                              <td className="px-2 py-1.5">{money(itemTotal(item))}</td>
                              <td className="px-2 py-1.5">{itemProfitPercent(item).toFixed(2)}</td>
                              <td className="px-2 py-1.5 text-center">
                                <Checkbox
                                  checked={item.foc}
                                  disabled={readOnly}
                                  onCheckedChange={(checked) =>
                                    updateItem(activeSection.id, area.id, item.id, (i) => ({
                                      ...i,
                                      foc: checked === true,
                                    }))
                                  }
                                />
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <Checkbox
                                  checked={item.inc}
                                  disabled={readOnly}
                                  onCheckedChange={(checked) =>
                                    updateItem(activeSection.id, area.id, item.id, (i) => ({
                                      ...i,
                                      inc: checked === true,
                                    }))
                                  }
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <button
                                  type="button"
                                  aria-label="Delete item"
                                  disabled={readOnly}
                                  className="disabled:cursor-not-allowed disabled:opacity-40"
                                  onClick={() => deleteItem(activeSection.id, area.id, item.id)}
                                >
                                  <Trash2 className="size-4 text-destructive" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button
                        type="button"
                        onClick={() => addItem(activeSection.id, area.id)}
                        disabled={readOnly}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-inherit disabled:hover:text-muted-foreground"
                      >
                        <Plus className="size-3.5" /> Add Row
                      </button>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            <Button variant="outline" className="shrink-0 self-end" disabled={readOnly} onClick={() => addArea(activeSection.id)}>
              Add New Area of Work
            </Button>

            <div className="grid shrink-0 grid-cols-3 gap-4 border-t pt-4">
              {(() => {
                const totals = sectionTotals(activeSection)
                return (
                  <>
                    <TotalBox label={`Total Price of ${activeSectionLabel}`} value={totals.price} currencySymbol={currencySymbol} />
                    <TotalBox label={`Total Cost Price of ${activeSectionLabel}`} value={totals.cost} currencySymbol={currencySymbol} />
                    <TotalBox label="Profit / Loss" value={totals.profit} currencySymbol={currencySymbol} />
                  </>
                )
              })()}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deletingArea !== null}
        onOpenChange={(open) => !open && setDeletingArea(null)}
        title={`Delete area of work "${deletingArea?.label}"?`}
        description="This also deletes all its line items."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deletingArea) deleteArea(deletingArea.sectionId, deletingArea.areaId)
        }}
      />

      <ConfirmDialog
        open={deletingSection !== null}
        onOpenChange={(open) => !open && setDeletingSection(null)}
        title={`Delete section "${deletingSection?.name}"?`}
        description="This also deletes all its areas of work and line items."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deletingSection) deleteSection(deletingSection.id)
        }}
      />
    </div>
  )
}

function TotalBox({ label, value, currencySymbol }: { label: string; value: number; currencySymbol: string }) {
  return (
    <div className="rounded-lg border px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{formatMoney(value, currencySymbol)}</p>
    </div>
  )
}
