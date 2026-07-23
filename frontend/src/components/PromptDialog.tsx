import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  label: string
  placeholder?: string
  initialValue?: string
  submitLabel?: string
  onSubmit: (value: string) => unknown
}

export function PromptDialog({
  open,
  onOpenChange,
  title,
  label,
  placeholder,
  initialValue = '',
  submitLabel = 'Save',
  onSubmit,
}: Props) {
  const [value, setValue] = useState(initialValue)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) setValue(initialValue)
  }, [open, initialValue])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) return
    setSubmitting(true)
    try {
      await onSubmit(value.trim())
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="prompt-value">{label}</Label>
              <Input
                id="prompt-value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                autoFocus
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!value.trim() || submitting}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
