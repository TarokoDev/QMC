import { useRef, useState } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api-client'
import { LOGO_FILE_ACCEPT, UnsupportedImageError, ImageTooLargeError, fileToLogoDataUrl } from '@/lib/image-to-data-url'
import { useSetCompany, useSettings } from '@/lib/settings-context'
import { deleteCompanyLogo, updateCompanyLogo } from '@/lib/settings-service'

interface Props {
  /** Only the master template editor sets this — everywhere else the logo is display-only. */
  editable?: boolean
}

export function CompanyLogoField({ editable = false }: Props) {
  const { company } = useSettings()
  const setCompany = useSetCompany()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleFile(file: File) {
    setBusy(true)
    setError(null)
    try {
      const dataUrl = await fileToLogoDataUrl(file)
      const { company: updated } = await updateCompanyLogo(dataUrl)
      setCompany(updated)
    } catch (err) {
      if (err instanceof UnsupportedImageError || err instanceof ImageTooLargeError || err instanceof ApiError) {
        setError(err.message)
      } else {
        console.error('Uploading the company logo failed:', err)
        setError('Uploading the logo failed. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setError(null)
    try {
      const { company: updated } = await deleteCompanyLogo()
      setCompany(updated)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        console.error('Removing the company logo failed:', err)
        setError('Removing the logo failed. Please try again.')
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border p-2 text-center text-sm text-muted-foreground">
        {company.logoDataUrl ? (
          <img src={company.logoDataUrl} alt="Company logo" className="max-h-full max-w-full object-contain" />
        ) : (
          'Company Logo'
        )}
      </div>

      {editable && (
        <>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
              {busy ? 'Uploading...' : company.logoDataUrl ? 'Change' : 'Upload'}
            </Button>
            {company.logoDataUrl && (
              <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={LOGO_FILE_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              // Reset first, so picking the same file again still fires `change`.
              e.target.value = ''
              if (file) void handleFile(file)
            }}
          />

          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={setConfirmDelete}
            title="Delete company logo?"
            description="The logo is shared by the whole app — every quote and PDF goes back to showing the placeholder."
            confirmLabel="Delete"
            destructive
            onConfirm={handleDelete}
          />
        </>
      )}

      {error && <p className="max-w-40 text-xs text-destructive">{error}</p>}
    </div>
  )
}
