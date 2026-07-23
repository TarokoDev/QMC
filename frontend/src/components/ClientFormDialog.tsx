import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ClientQuoteSource } from '@/lib/client-service'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  submitLabel: string
  initialName?: string
  initialEmail?: string
  initialContactNumber?: string
  showSourceSelector?: boolean
  onSubmit: (name: string, email: string, contactNumber: string, source: ClientQuoteSource) => void | Promise<void>
}

export function ClientFormDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  initialName = '',
  initialEmail = '',
  initialContactNumber = '',
  showSourceSelector = false,
  onSubmit,
}: Props) {
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [contactNumber, setContactNumber] = useState(initialContactNumber)
  const [source, setSource] = useState<ClientQuoteSource>('master')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(initialName)
      setEmail(initialEmail)
      setContactNumber(initialContactNumber)
      setSource('master')
    }
  }, [open, initialName, initialEmail, initialContactNumber])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      await onSubmit(name.trim(), email.trim(), contactNumber.trim(), source)
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

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="client-name">Client Name</Label>
              <Input
                id="client-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mr Tan"
                autoFocus
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="client-email">Email</Label>
              <Input
                id="client-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@email.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="client-contact">Contact Number</Label>
              <Input
                id="client-contact"
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="9123 4567"
              />
            </div>
            {showSourceSelector && (
              <div className="flex flex-col gap-1.5">
                <Label>Start From</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSource('master')}
                    className={cn(
                      'flex-1 rounded-md border px-3 py-2 text-sm font-medium',
                      source === 'master'
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Master Template
                  </button>
                  <button
                    type="button"
                    onClick={() => setSource('scratch')}
                    className={cn(
                      'flex-1 rounded-md border px-3 py-2 text-sm font-medium',
                      source === 'scratch'
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Start from Scratch
                  </button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || submitting}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
