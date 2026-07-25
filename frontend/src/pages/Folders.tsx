import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Breadcrumb } from '@/components/Breadcrumb'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadErrorState } from '@/components/LoadErrorState'
import { PromptDialog } from '@/components/PromptDialog'
import { Card, CardTitle } from '@/components/ui/card'
import { useCategoryLibrary } from '@/lib/category-library-context'

export function Folders() {
  const navigate = useNavigate()
  const { folders, loading, error, reload, addFolder, renameFolder, deleteFolder } = useCategoryLibrary()

  const [addOpen, setAddOpen] = useState(false)
  const [renamingFolder, setRenamingFolder] = useState<{ id: string; name: string } | null>(null)
  const [deletingFolder, setDeletingFolder] = useState<{ id: string; name: string } | null>(null)

  function handleRenameFolder(e: React.MouseEvent, id: string, currentName: string) {
    e.stopPropagation()
    setRenamingFolder({ id, name: currentName })
  }

  function handleDeleteFolder(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation()
    setDeletingFolder({ id, name })
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <Breadcrumb items={[{ label: 'Generate Quote' }]} />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : error ? (
        <LoadErrorState message={error} onRetry={reload} />
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {folders.map((folder) => (
            <Card
              key={folder.id}
              onClick={() => navigate(`/quotes/new/category/${folder.id}`)}
              className="group/folder relative flex h-28 cursor-pointer items-center justify-center text-center hover:bg-muted/50"
            >
              <CardTitle className="px-2 text-sm font-medium">{folder.name}</CardTitle>
              <div className="absolute top-2 right-2 hidden gap-1 group-hover/folder:flex">
                <button
                  type="button"
                  aria-label="Rename folder"
                  onClick={(e) => handleRenameFolder(e, folder.id, folder.name)}
                  className="rounded p-1 hover:bg-muted"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Delete folder"
                  onClick={(e) => handleDeleteFolder(e, folder.id, folder.name)}
                  className="rounded p-1 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </Card>
          ))}

          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex h-28 flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Plus className="size-4" />
            Add Folder
          </button>
        </div>
      )}

      <PromptDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="New Folder"
        label="Folder Name"
        submitLabel="Create"
        onSubmit={(name) => addFolder(name)}
      />

      <PromptDialog
        open={renamingFolder !== null}
        onOpenChange={(open) => !open && setRenamingFolder(null)}
        title="Rename Folder"
        label="Folder Name"
        initialValue={renamingFolder?.name}
        submitLabel="Save"
        onSubmit={(name) => {
          if (renamingFolder) return renameFolder(renamingFolder.id, name)
        }}
      />

      <ConfirmDialog
        open={deletingFolder !== null}
        onOpenChange={(open) => !open && setDeletingFolder(null)}
        title={`Delete folder "${deletingFolder?.name}"?`}
        description="This also deletes all its categories, clients, and revisions."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deletingFolder) return deleteFolder(deletingFolder.id)
        }}
      />
    </div>
  )
}
