import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useCategoryLibrary } from '@/lib/category-library-context'
import type { Category } from '@/lib/category-library-service'
import type { Quote } from '@/lib/mock-data'
import { QuoteEditorLayout, type RevisionChip } from '@/pages/QuoteEditor/QuoteEditorLayout'

interface SessionRevision extends RevisionChip {
  quote: Quote
}

export function CategoryEditor() {
  const { categoryId } = useParams<'categoryId'>()
  const { loading, folders, getCategory, updateCategoryQuote } = useCategoryLibrary()
  const category = categoryId ? getCategory(categoryId) : undefined
  const folder = category ? folders.find((f) => f.id === category.folderId) : undefined

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>
  if (!category) return <p className="text-sm text-muted-foreground">Category not found.</p>

  return (
    <CategoryEditorInner
      key={category.id}
      category={category}
      folderName={folder?.name ?? ''}
      onQuoteChange={(quote) => updateCategoryQuote(category.id, quote)}
    />
  )
}

function CategoryEditorInner({
  category,
  folderName,
  onQuoteChange,
}: {
  category: Category
  folderName: string
  onQuoteChange: (quote: Quote) => void
}) {
  const [revisions, setRevisions] = useState<SessionRevision[]>(() => [
    { id: 'revision-0', label: 'R0', quote: structuredClone(category.quote) },
  ])
  const [activeRevisionId, setActiveRevisionId] = useState('revision-0')

  const activeRevision = revisions.find((revision) => revision.id === activeRevisionId) ?? revisions[0]

  const onQuoteChangeRef = useRef(onQuoteChange)
  onQuoteChangeRef.current = onQuoteChange

  // Only persist revisions the user actually edited — otherwise merely opening
  // the editor (or switching revision chips) rewrites the category's sections.
  const dirtyRevisionIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (dirtyRevisionIdRef.current !== activeRevisionId) return
    const timeout = setTimeout(() => {
      dirtyRevisionIdRef.current = null
      onQuoteChangeRef.current(activeRevision.quote)
    }, 500)
    return () => clearTimeout(timeout)
  }, [activeRevisionId, activeRevision.quote])

  function handleQuoteChange(quote: Quote) {
    dirtyRevisionIdRef.current = activeRevisionId
    setRevisions((prev) => prev.map((revision) => (revision.id === activeRevisionId ? { ...revision, quote } : revision)))
  }

  function addRevision() {
    const cloned = structuredClone(activeRevision.quote)
    const newRevision: SessionRevision = {
      id: `revision-${revisions.length}`,
      label: `R${revisions.length}`,
      quote: cloned,
    }
    setRevisions((prev) => [...prev, newRevision])
    setActiveRevisionId(newRevision.id)
  }

  function deleteRevision(id: string) {
    const index = revisions.findIndex((revision) => revision.id === id)
    if (index <= 0 || index !== revisions.length - 1) return
    const remaining = revisions.slice(0, -1)
    setRevisions(remaining)
    if (activeRevisionId === id) {
      setActiveRevisionId(remaining[remaining.length - 1].id)
    }
  }

  return (
    <QuoteEditorLayout
      breadcrumbItems={[
        { label: 'Generate Quote', to: '/quotes/new/category' },
        { label: folderName, to: `/quotes/new/category/${category.folderId}` },
        { label: category.name },
      ]}
      revisions={revisions}
      activeRevisionId={activeRevisionId}
      onSelectRevision={setActiveRevisionId}
      onAddRevision={addRevision}
      onDeleteRevision={deleteRevision}
      quote={activeRevision.quote}
      onQuoteChange={handleQuoteChange}
    />
  )
}
