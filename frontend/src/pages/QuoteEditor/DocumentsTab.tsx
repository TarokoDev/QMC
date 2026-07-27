import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, FileText, Trash2, Upload } from 'lucide-react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadErrorState } from '@/components/LoadErrorState'
import { Button } from '@/components/ui/button'
import { formatDateDisplay } from '@/lib/date'
import {
  type RevisionDocument,
  MAX_DOCUMENT_BYTES,
  deleteDocument,
  formatFileSize,
  getDownloadUrl,
  getUserDownloadUrl,
  listDocuments,
  listUserDocuments,
  uploadDocument,
} from '@/lib/document-service'

interface Props {
  revisionId: string
  /** Earlier revisions and admin views: list and download, nothing else. */
  readOnly: boolean
  /** Set only by the admin drill-down, where the documents belong to someone else. */
  adminUserId?: string
}

interface InFlight {
  key: string
  fileName: string
  progress: number
  error?: string
}

/** Uploading a folder of site photos should not open twenty sockets at once. */
const MAX_CONCURRENT_UPLOADS = 3

/**
 * Files filed against one revision — most often the exported quote after the
 * client has signed it, alongside SketchUp models and site photos.
 *
 * Documents belong to the revision they were attached to and are never copied
 * forward: a signed R1 PDF is evidence about R1, so a new revision starts with
 * an empty list.
 */
export function DocumentsTab({ revisionId, readOnly, adminUserId }: Props) {
  const [documents, setDocuments] = useState<RevisionDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [inFlight, setInFlight] = useState<InFlight[]>([])
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<RevisionDocument | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setDocuments(adminUserId ? await listUserDocuments(adminUserId, revisionId) : await listDocuments(revisionId))
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [adminUserId, revisionId])

  useEffect(() => {
    void load()
  }, [load])

  async function runUpload(file: File, key: string) {
    setInFlight((current) => [...current, { key, fileName: file.name, progress: 0 }])
    try {
      const uploaded = await uploadDocument(revisionId, file, (progress) => {
        setInFlight((current) => current.map((row) => (row.key === key ? { ...row, progress } : row)))
      })
      setDocuments((current) => [...current, uploaded])
      setInFlight((current) => current.filter((row) => row.key !== key))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed.'
      setInFlight((current) => current.map((row) => (row.key === key ? { ...row, error: message } : row)))
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setActionError(null)

    const queue = Array.from(files).map((file, index) => ({ file, key: `${Date.now()}-${index}-${file.name}` }))
    const workers = Array.from({ length: Math.min(MAX_CONCURRENT_UPLOADS, queue.length) }, async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        await runUpload(next.file, next.key)
      }
    })
    await Promise.all(workers)
  }

  async function handleDownload(document: RevisionDocument) {
    setActionError(null)
    try {
      const url = adminUserId ? await getUserDownloadUrl(adminUserId, document.id) : await getDownloadUrl(document.id)
      // The URL is signed, single-use in practice and expires in a minute, so
      // it is handed to the browser and never kept.
      window.location.href = url
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not start the download.')
    }
  }

  async function handleDelete(document: RevisionDocument) {
    setActionError(null)
    try {
      await deleteDocument(document.id)
      setDocuments((current) => current.filter((row) => row.id !== document.id))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not delete that document.')
    }
  }

  if (loadError) {
    return (
      <div className="flex h-full flex-col">
        <LoadErrorState message={loadError} onRetry={() => void load()} />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      {!readOnly && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            void handleFiles(e.dataTransfer.files)
          }}
          className={`flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors ${
            dragging ? 'border-primary bg-primary/5' : 'border-input'
          }`}
        >
          <Upload className="size-6 text-muted-foreground" />
          <p className="text-sm">Drop files here, or</p>
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            Choose files
          </Button>
          <p className="text-xs text-muted-foreground">
            Any file type — signed PDFs, SketchUp files, photos. Up to {formatFileSize(MAX_DOCUMENT_BYTES)} each.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              void handleFiles(e.target.files)
              // Lets the same file be picked again after a failed attempt.
              e.target.value = ''
            }}
          />
        </div>
      )}

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      {inFlight.map((row) => (
        <div key={row.key} className="rounded-lg border px-3 py-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate">{row.fileName}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {row.error ? 'Failed' : `${Math.round(row.progress * 100)}%`}
            </span>
          </div>
          {row.error ? (
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="text-xs text-destructive">{row.error}</p>
              <button
                type="button"
                className="shrink-0 text-xs text-muted-foreground underline"
                onClick={() => setInFlight((current) => current.filter((item) => item.key !== row.key))}
              >
                Dismiss
              </button>
            </div>
          ) : (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${row.progress * 100}%` }} />
            </div>
          )}
        </div>
      ))}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading documents…</p>
      ) : documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {readOnly
            ? 'No documents were attached to this revision.'
            : 'No documents yet — attach the signed quote, SketchUp files or site photos.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((document) => (
            <li key={document.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{document.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(document.sizeBytes)} · {formatDateDisplay(new Date(document.createdAt))}
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => void handleDownload(document)}>
                <Download className="size-4" />
                Download
              </Button>
              {!readOnly && (
                <button
                  type="button"
                  aria-label={`Delete ${document.fileName}`}
                  className="shrink-0 rounded p-1 text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleting(document)}
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.fileName ?? 'document'}?`}
        description="The file is removed from storage and cannot be recovered."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          const target = deleting
          setDeleting(null)
          if (target) return handleDelete(target)
        }}
      />
    </div>
  )
}
