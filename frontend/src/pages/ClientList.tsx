import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Breadcrumb } from '@/components/Breadcrumb'
import { ClientFormDialog } from '@/components/ClientFormDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { useCategoryLibrary } from '@/lib/category-library-context'
import * as clientService from '@/lib/client-service'
import type { Client } from '@/lib/client-service'

export function ClientList() {
  const navigate = useNavigate()
  const { folderId, categoryId } = useParams<'folderId' | 'categoryId'>()
  const { folders, getCategory, loading: libraryLoading } = useCategoryLibrary()

  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deletingClient, setDeletingClient] = useState<{ id: string; name: string } | null>(null)

  const folder = folders.find((f) => f.id === folderId)
  const category = categoryId ? getCategory(categoryId) : undefined

  useEffect(() => {
    if (!categoryId) return
    let cancelled = false
    clientService.listClients(categoryId).then((loaded) => {
      if (!cancelled) {
        setClients(loaded)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [categoryId])

  async function handleCreateSubmit(
    name: string,
    email: string,
    contactNumber: string,
    source: clientService.ClientQuoteSource,
  ) {
    if (!categoryId) return
    const client = await clientService.createClient(categoryId, name, email, contactNumber, source)
    navigate(`/quotes/edit/client/${client.id}`)
  }

  function handleEditClient(e: React.MouseEvent, client: Client) {
    e.stopPropagation()
    setEditingClient(client)
  }

  function handleDelete(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation()
    setDeletingClient({ id, name })
  }

  if (libraryLoading || loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  if (!folder || !category) {
    return <p className="text-sm text-muted-foreground">Category not found.</p>
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <Breadcrumb
        items={[
          { label: 'Generate Quote', to: '/quotes/new/category' },
          { label: folder.name, to: `/quotes/new/category/${folder.id}` },
          { label: category.name },
        ]}
      />

      {clients.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">No clients yet for {category.name}.</p>
          <Button onClick={() => setCreateOpen(true)}>Create New Client</Button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {clients.map((client) => (
            <Card
              key={client.id}
              onClick={() => navigate(`/quotes/edit/client/${client.id}`)}
              className="group/client relative flex h-28 cursor-pointer items-center justify-center text-center hover:bg-muted/50"
            >
              <CardTitle className="px-2 text-sm font-medium">{client.name}</CardTitle>
              <div className="absolute top-2 right-2 hidden gap-1 group-hover/client:flex">
                <button
                  type="button"
                  aria-label="Edit client"
                  onClick={(e) => handleEditClient(e, client)}
                  className="rounded p-1 hover:bg-muted"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Delete client"
                  onClick={(e) => handleDelete(e, client.id, client.name)}
                  className="rounded p-1 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {clients.length > 0 && (
        <div className="mt-6 flex justify-end">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> New Client
          </Button>
        </div>
      )}

      <ClientFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New Client"
        submitLabel="Create"
        showSourceSelector
        onSubmit={handleCreateSubmit}
      />

      <ClientFormDialog
        open={editingClient !== null}
        onOpenChange={(open) => !open && setEditingClient(null)}
        title="Edit Client"
        submitLabel="Save"
        initialName={editingClient?.name}
        initialEmail={editingClient?.email}
        initialContactNumber={editingClient?.contactNumber}
        onSubmit={async (name, email, contactNumber) => {
          if (!editingClient) return
          const updated = await clientService.updateClient(editingClient.id, name, email, contactNumber)
          setClients((prev) => prev.map((client) => (client.id === updated.id ? updated : client)))
        }}
      />

      <ConfirmDialog
        open={deletingClient !== null}
        onOpenChange={(open) => !open && setDeletingClient(null)}
        title={`Delete client "${deletingClient?.name}"?`}
        description="This also deletes all its revisions."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!deletingClient) return
          await clientService.deleteClient(deletingClient.id)
          setClients((prev) => prev.filter((client) => client.id !== deletingClient.id))
        }}
      />
    </div>
  )
}
