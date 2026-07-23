import { Copy, FileEdit, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Breadcrumb } from '@/components/Breadcrumb'
import { CategoryFormDialog } from '@/components/CategoryFormDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PromptDialog } from '@/components/PromptDialog'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { useCategoryLibrary } from '@/lib/category-library-context'
import type { Category } from '@/lib/category-library-service'

export function CategoryList() {
  const navigate = useNavigate()
  const { folderId } = useParams<'folderId'>()
  const { folders, loading, categoriesInFolder, createCategory, duplicateCategory, updateCategory, deleteCategory } =
    useCategoryLibrary()

  const [createOpen, setCreateOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [duplicatingCategory, setDuplicatingCategory] = useState<{ id: string; name: string } | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<{ id: string; name: string } | null>(null)

  const folder = folders.find((f) => f.id === folderId)
  const categories = folderId ? categoriesInFolder(folderId) : []

  async function handleCreateSubmit(name: string, description: string) {
    if (!folderId) return
    const category = await createCategory(folderId, name, description)
    navigate(`/quotes/new/category/${folderId}/${category.id}`)
  }

  function handleEditCategory(e: React.MouseEvent, category: Category) {
    e.stopPropagation()
    setEditingCategory(category)
  }

  function handleDuplicate(e: React.MouseEvent, id: string, currentName: string) {
    e.stopPropagation()
    setDuplicatingCategory({ id, name: currentName })
  }

  function handleDelete(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation()
    setDeletingCategory({ id, name })
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  if (!folder) {
    return <p className="text-sm text-muted-foreground">Folder not found.</p>
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <Breadcrumb
        items={[{ label: 'Generate Quote', to: '/quotes/new/category' }, { label: folder.name }]}
      />

      {categories.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">No categories yet in {folder.name}.</p>
          <Button onClick={() => setCreateOpen(true)}>New Category</Button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {categories.map((category) => (
            <Card
              key={category.id}
              onClick={() => navigate(`/quotes/new/category/${folderId}/${category.id}`)}
              className="group/category relative flex h-28 flex-col items-center justify-center gap-1 text-center hover:bg-muted/50"
            >
              <CardTitle className="px-2 text-sm font-medium">{category.name}</CardTitle>
              {category.description && (
                <p className="line-clamp-2 px-3 text-xs text-muted-foreground">{category.description}</p>
              )}
              <div className="absolute top-2 right-2 hidden gap-1 group-hover/category:flex">
                <button
                  type="button"
                  aria-label="Edit category content"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/quotes/edit/category/${category.id}`)
                  }}
                  className="rounded p-1 hover:bg-muted"
                >
                  <FileEdit className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Duplicate category"
                  onClick={(e) => handleDuplicate(e, category.id, category.name)}
                  className="rounded p-1 hover:bg-muted"
                >
                  <Copy className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Rename category"
                  onClick={(e) => handleEditCategory(e, category)}
                  className="rounded p-1 hover:bg-muted"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Delete category"
                  onClick={(e) => handleDelete(e, category.id, category.name)}
                  className="rounded p-1 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {categories.length > 0 && (
        <div className="mt-6 flex justify-end">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> New Category
          </Button>
        </div>
      )}

      <CategoryFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New Category"
        submitLabel="Create"
        onSubmit={handleCreateSubmit}
      />

      <CategoryFormDialog
        open={editingCategory !== null}
        onOpenChange={(open) => !open && setEditingCategory(null)}
        title="Edit Category"
        submitLabel="Save"
        initialName={editingCategory?.name}
        initialDescription={editingCategory?.description}
        onSubmit={(name, description) => {
          if (editingCategory) return updateCategory(editingCategory.id, name, description)
        }}
      />

      <PromptDialog
        open={duplicatingCategory !== null}
        onOpenChange={(open) => !open && setDuplicatingCategory(null)}
        title="Duplicate Category"
        label="Name for the duplicate"
        initialValue={duplicatingCategory ? `${duplicatingCategory.name} Copy` : ''}
        submitLabel="Duplicate"
        onSubmit={(name) => {
          if (duplicatingCategory) return duplicateCategory(duplicatingCategory.id, name)
        }}
      />

      <ConfirmDialog
        open={deletingCategory !== null}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
        title={`Delete category "${deletingCategory?.name}"?`}
        description="This also deletes all its clients and revisions."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deletingCategory) return deleteCategory(deletingCategory.id)
        }}
      />
    </div>
  )
}
