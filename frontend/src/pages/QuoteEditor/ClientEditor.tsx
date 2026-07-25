import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useCategoryLibrary } from '@/lib/category-library-context'
import * as clientService from '@/lib/client-service'
import type { Client } from '@/lib/client-service'
import * as masterTemplateService from '@/lib/master-template-service'
import type { Quote } from '@/lib/mock-data'
import * as revisionService from '@/lib/revision-service'
import type { RevisionSummary } from '@/lib/revision-service'
import { QuoteEditorLayout } from '@/pages/QuoteEditor/QuoteEditorLayout'

export function ClientEditor() {
  const { clientId } = useParams<'clientId'>()
  const { folders, getCategory } = useCategoryLibrary()

  const [client, setClient] = useState<Client | null>(null)
  const [revisions, setRevisions] = useState<RevisionSummary[]>([])
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [activeRevisionId, setActiveRevisionId] = useState('')
  const [loading, setLoading] = useState(true)
  const [cloning, setCloning] = useState(false)

  useEffect(() => {
    if (!clientId) return
    let cancelled = false

    async function load() {
      const [loadedClient, loadedRevisions] = await Promise.all([
        clientService.getClient(clientId!),
        revisionService.listRevisions(clientId!),
      ])
      const latest = [...loadedRevisions].sort((a, b) => b.position - a.position)[0]
      const latestFull = latest ? await revisionService.getRevision(latest.id) : null
      if (cancelled) return

      setClient(loadedClient)
      setRevisions(loadedRevisions)
      if (latestFull) {
        setQuotes({ [latestFull.id]: withLiveClientInfo(latestFull.quote, loadedClient) })
        setActiveRevisionId(latestFull.id)
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [clientId])

  function withLiveClientInfo(quote: Quote, liveClient: Client): Quote {
    return {
      ...quote,
      info: { ...quote.info, clientName: liveClient.name, email: liveClient.email, contact: liveClient.contactNumber },
    }
  }

  const activeQuote = quotes[activeRevisionId]

  // Which revision has unsaved edits. Without this the debounce fires on every
  // load and revision switch, rewriting the whole section tree server-side for
  // quotes nobody touched.
  const dirtyRevisionIdRef = useRef<string | null>(null)

  const onSaveRef = useRef(revisionService.updateRevisionQuote)
  useEffect(() => {
    if (!activeQuote || !activeRevisionId) return
    if (dirtyRevisionIdRef.current !== activeRevisionId) return
    const timeout = setTimeout(() => {
      dirtyRevisionIdRef.current = null
      onSaveRef.current(activeRevisionId, activeQuote).catch((err) => {
        console.error('Saving the quote failed:', err)
      })
    }, 500)
    return () => clearTimeout(timeout)
  }, [activeRevisionId, activeQuote])

  function handleQuoteChange(quote: Quote) {
    dirtyRevisionIdRef.current = activeRevisionId
    setQuotes((prev) => ({ ...prev, [activeRevisionId]: quote }))
  }

  const clientDirtyRef = useRef(false)
  const clientSaveRef = useRef(clientService.updateClient)
  useEffect(() => {
    if (!client || !clientDirtyRef.current) return
    const timeout = setTimeout(() => {
      clientDirtyRef.current = false
      clientSaveRef.current(client.id, client.name, client.email, client.contactNumber).catch((err) => {
        console.error('Saving the client failed:', err)
      })
    }, 500)
    return () => clearTimeout(timeout)
  }, [client])

  function handleClientFieldChange(field: 'clientName' | 'email' | 'contact', value: string) {
    if (!client) return
    clientDirtyRef.current = true
    dirtyRevisionIdRef.current = activeRevisionId
    const updatedClient: Client = {
      ...client,
      name: field === 'clientName' ? value : client.name,
      email: field === 'email' ? value : client.email,
      contactNumber: field === 'contact' ? value : client.contactNumber,
    }
    setClient(updatedClient)
    setQuotes((prev) => ({ ...prev, [activeRevisionId]: withLiveClientInfo(prev[activeRevisionId], updatedClient) }))
  }

  async function handleUseMasterTemplate() {
    const master = await masterTemplateService.getMasterTemplate()
    dirtyRevisionIdRef.current = activeRevisionId
    setQuotes((prev) => ({
      ...prev,
      [activeRevisionId]: { ...prev[activeRevisionId], sections: master.quote.sections },
    }))
  }

  function handleResetTemplate() {
    dirtyRevisionIdRef.current = activeRevisionId
    setQuotes((prev) => ({
      ...prev,
      [activeRevisionId]: { ...prev[activeRevisionId], sections: [] },
    }))
  }

  async function handleSelectRevision(id: string) {
    if (quotes[id]) {
      setActiveRevisionId(id)
      return
    }
    const revision = await revisionService.getRevision(id)
    setQuotes((prev) => ({ ...prev, [id]: client ? withLiveClientInfo(revision.quote, client) : revision.quote }))
    setActiveRevisionId(id)
  }

  async function handleAddRevision() {
    setCloning(true)
    try {
      const created = await revisionService.cloneRevision(clientId!, activeRevisionId)
      setRevisions((prev) => [...prev, created])
      setQuotes((prev) => ({ ...prev, [created.id]: client ? withLiveClientInfo(created.quote, client) : created.quote }))
      setActiveRevisionId(created.id)
    } finally {
      setCloning(false)
    }
  }

  async function handleDeleteRevision(id: string) {
    await revisionService.deleteRevision(id)
    const remaining = revisions.filter((revision) => revision.id !== id)
    setRevisions(remaining)
    setQuotes((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    if (activeRevisionId === id) {
      const newLatest = [...remaining].sort((a, b) => b.position - a.position)[0]
      if (newLatest) await handleSelectRevision(newLatest.id)
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>
  if (!client || !activeQuote) return <p className="text-sm text-muted-foreground">Client not found.</p>

  const category = getCategory(client.categoryId)
  const folder = category ? folders.find((f) => f.id === category.folderId) : undefined

  return (
    <QuoteEditorLayout
      breadcrumbItems={[
        { label: 'Generate Quote', to: '/quotes/new/category' },
        { label: folder?.name ?? '', to: folder ? `/quotes/new/category/${folder.id}` : undefined },
        { label: category?.name ?? '', to: category ? `/quotes/new/category/${folder?.id}/${category.id}` : undefined },
        { label: client.name },
      ]}
      revisions={[...revisions].sort((a, b) => a.position - b.position)}
      activeRevisionId={activeRevisionId}
      onSelectRevision={handleSelectRevision}
      onAddRevision={handleAddRevision}
      addRevisionDisabled={cloning}
      onDeleteRevision={handleDeleteRevision}
      quote={activeQuote}
      onQuoteChange={handleQuoteChange}
      onClientFieldChange={handleClientFieldChange}
      onResetTemplate={handleResetTemplate}
      onUseMasterTemplate={handleUseMasterTemplate}
    />
  )
}
