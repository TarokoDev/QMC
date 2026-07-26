import { RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  invalid: boolean
  onRefresh: () => void
  refreshing: boolean
  /** When the data on screen was last fetched — a stale tab should be obvious. */
  lastUpdated: Date | null
}

export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  invalid,
  onRefresh,
  refreshing,
  lastUpdated,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        From
        <Input type="date" value={from} max={to} onChange={(e) => onFromChange(e.target.value)} className="w-40" />
      </label>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        To
        <Input type="date" value={to} min={from} onChange={(e) => onToChange(e.target.value)} className="w-40" />
      </label>

      {invalid && <span className="text-sm text-destructive">Start date is after the end date.</span>}

      <div className="ml-auto flex items-center gap-2">
        {lastUpdated && (
          <span className="text-xs text-muted-foreground">Updated {format(lastUpdated, 'HH:mm:ss')}</span>
        )}
        <Button variant="outline" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw className={refreshing ? 'size-4 animate-spin' : 'size-4'} />
          Refresh
        </Button>
      </div>
    </div>
  )
}
