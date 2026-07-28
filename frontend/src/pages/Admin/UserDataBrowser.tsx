import { ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { LoadErrorState } from '@/components/LoadErrorState'
import { Card, CardTitle } from '@/components/ui/card'
import {
  type AdminCategory,
  type AdminClient,
  type AdminFolder,
  type AdminRevision,
  type AdminRevisionSummary,
  fetchUserCategories,
  fetchUserClients,
  fetchUserFolders,
  fetchUserRevision,
  fetchUserRevisions,
} from '@/lib/auth-event-service'
import { QuoteEditorLayout } from '@/pages/QuoteEditor/QuoteEditorLayout'

interface Selection {
  folder?: AdminFolder
  category?: AdminCategory
  client?: AdminClient
}

/**
 * Read-only walk through another user's folder → category → client → revision
 * → quote tree, mirroring what that user sees in their own app.
 *
 * Deliberately does its own fetching instead of using CategoryLibraryProvider:
 * that provider takes no owner parameter, is mounted app-wide, and would answer
 * for the *admin's* data. Every call here goes to a GET-only /api/admin route.
 */
export function UserDataBrowser({ userId }: { userId: string }) {
  const [selection, setSelection] = useState<Selection>({})
  const [folders, setFolders] = useState<AdminFolder[]>([])
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [clients, setClients] = useState<AdminClient[]>([])
  const [revisions, setRevisions] = useState<AdminRevisionSummary[]>([])
  const [revision, setRevision] = useState<AdminRevision | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function fail(err: unknown, fallback: string) {
    setError(err instanceof Error ? err.message : fallback)
  }

  useEffect(() => {
    setLoading(true)
    setSelection({})
    fetchUserFolders(userId)
      .then(setFolders)
      .catch((err) => fail(err, "Could not load this user's folders."))
      .finally(() => setLoading(false))
  }, [userId])

  async function openFolder(folder: AdminFolder) {
    setSelection({ folder })
    setRevision(null)
    try {
      setCategories(await fetchUserCategories(userId, folder.id))
    } catch (err) {
      fail(err, 'Could not load categories.')
    }
  }

  async function openCategory(category: AdminCategory) {
    setSelection((current) => ({ ...current, category, client: undefined }))
    setRevision(null)
    try {
      setClients(await fetchUserClients(userId, category.id))
    } catch (err) {
      fail(err, 'Could not load clients.')
    }
  }

  async function openClient(client: AdminClient) {
    setSelection((current) => ({ ...current, client }))
    try {
      const list = await fetchUserRevisions(userId, client.id)
      setRevisions(list)
      // Open on the latest revision — the one that would go to the client.
      const latest = list.at(-1)
      setRevision(latest ? await fetchUserRevision(userId, latest.id) : null)
    } catch (err) {
      fail(err, 'Could not load revisions.')
    }
  }

  async function selectRevision(id: string) {
    try {
      setRevision(await fetchUserRevision(userId, id))
    } catch (err) {
      fail(err, 'Could not load that revision.')
    }
  }

  if (error) {
    return <LoadErrorState message={error} onRetry={() => setError(null)} />
  }

  if (loading) return <p className="mt-4 text-sm text-muted-foreground">Loading...</p>

  if (selection.client && revision) {
    return (
      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <QuoteEditorLayout
          breadcrumbItems={[
            { label: selection.folder?.name ?? '' },
            { label: selection.category?.name ?? '' },
            { label: selection.client.name },
          ]}
          revisions={revisions.map((item) => ({ id: item.id, label: item.label, updatedAt: item.updatedAt }))}
          activeRevisionId={revision.id}
          onSelectRevision={(id) => void selectRevision(id)}
          // Required by the layout but unreachable: `readOnly` hides every
          // control that could call it, and no write endpoint accepts another
          // user's id anyway.
          onAddRevision={() => {}}
          quote={revision.quote}
          onQuoteChange={() => {}}
          readOnly
          adminUserId={userId}
        />
        <button
          type="button"
          onClick={() => {
            setSelection((current) => ({ ...current, client: undefined }))
            setRevision(null)
          }}
          className="mt-3 self-start text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to clients
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <button type="button" onClick={() => setSelection({})} className="hover:text-foreground">
          Folders
        </button>
        {selection.folder && (
          <>
            <ChevronRight className="size-3.5" />
            <button
              type="button"
              onClick={() => setSelection({ folder: selection.folder })}
              className="hover:text-foreground"
            >
              {selection.folder.name}
            </button>
          </>
        )}
        {selection.category && (
          <>
            <ChevronRight className="size-3.5" />
            <span className="text-foreground">{selection.category.name}</span>
          </>
        )}
      </nav>

      <Grid
        items={
          selection.category
            ? clients.map((client) => ({ id: client.id, label: client.name, onOpen: () => void openClient(client) }))
            : selection.folder
              ? categories.map((category) => ({
                  id: category.id,
                  label: category.name,
                  onOpen: () => void openCategory(category),
                }))
              : folders.map((folder) => ({ id: folder.id, label: folder.name, onOpen: () => void openFolder(folder) }))
        }
        emptyLabel={
          selection.category ? 'No clients here.' : selection.folder ? 'No categories here.' : 'This user has no folders.'
        }
      />
    </div>
  )
}

function Grid({
  items,
  emptyLabel,
}: {
  items: { id: string; label: string; onOpen: () => void }[]
  emptyLabel: string
}) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{emptyLabel}</p>

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((item) => (
        <Card
          key={item.id}
          onClick={item.onOpen}
          className="flex h-28 cursor-pointer items-center justify-center text-center hover:bg-muted/50"
        >
          <CardTitle className="px-2 text-sm font-medium">{item.label}</CardTitle>
        </Card>
      ))}
    </div>
  )
}
