import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { formatDateDisplay } from '@/lib/date'
import type { Quote } from '@/lib/mock-data'
import { useSettings } from '@/lib/settings-context'

const DESIGNER = 'Kim Lim'

interface Props {
  quote: Quote
  onChange: (quote: Quote) => void
  revisionLabel: string
  readOnly?: boolean
  onClientFieldChange?: (field: 'clientName' | 'email' | 'contact', value: string) => void
}

export function BasicInformationTab({ quote, onChange, revisionLabel, readOnly, onClientFieldChange }: Props) {
  const { company } = useSettings()

  function updateInfo<K extends keyof Quote['info']>(key: K, value: Quote['info'][K]) {
    onChange({ ...quote, info: { ...quote.info, [key]: value } })
  }

  function updateClientField(field: 'clientName' | 'email' | 'contact', value: string) {
    updateInfo(field, value)
    onClientFieldChange?.(field, value)
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto">
      <div className="flex gap-4">
        <div className="flex h-24 w-40 shrink-0 items-center justify-center rounded-lg border text-center text-sm text-muted-foreground">
          Company Logo
        </div>
        <div className="text-sm leading-relaxed">
          <p className="font-medium">{company.name}</p>
          <p>Address: {company.address}</p>
          <p>
            Tel: {company.tel} UEN: {company.uen} GST: {company.gst}
          </p>
          <p>Website: {company.website}</p>
        </div>
      </div>

      <Separator />

      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold">Client</h3>
        <div className="grid max-w-xl grid-cols-1 gap-4">
          <Field
            label="Name"
            value={quote.info.clientName}
            onChange={(v) => updateClientField('clientName', v)}
            disabled={onClientFieldChange ? readOnly : true}
          />
          <Field
            label="Email"
            value={quote.info.email}
            onChange={(v) => updateClientField('email', v)}
            disabled={onClientFieldChange ? readOnly : true}
          />
          <Field
            label="Contact"
            value={quote.info.contact}
            onChange={(v) => updateClientField('contact', v)}
            disabled={onClientFieldChange ? readOnly : true}
          />
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold">Project</h3>
        <div className="grid max-w-xl grid-cols-1 gap-4">
          <Field
            label="Project Site"
            value={quote.info.projectSite}
            onChange={(v) => updateInfo('projectSite', v)}
            disabled={readOnly}
          />
          <Field label="Quotation" value={revisionLabel} onChange={() => {}} disabled />
          <Field
            label="REF"
            value={quote.info.refNumber}
            onChange={(v) => updateInfo('refNumber', v)}
            disabled={readOnly}
          />
          <DateField value={quote.info.date} onChange={(v) => updateInfo('date', v)} disabled={readOnly} />
          <Field label="Designer" value={DESIGNER} onChange={() => {}} disabled />
        </div>
      </section>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <Label className="w-28 shrink-0 text-muted-foreground">{label}:</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
    </div>
  )
}

function DateField({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const parsed = new Date(value)
  const selected = Number.isNaN(parsed.getTime()) ? undefined : parsed

  return (
    <div className="flex items-center gap-2">
      <Label className="w-28 shrink-0 text-muted-foreground">Date:</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="flex w-full items-center justify-between rounded-md border bg-transparent px-3 py-2 text-left text-sm shadow-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            {value || 'Pick a date'}
            <CalendarIcon className="size-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={(date) => date && onChange(formatDateDisplay(date))}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
