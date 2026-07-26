import { Card } from '@/components/ui/card'

interface Props {
  label: string
  value: string | number
  hint?: string
}

/** One number in the admin metric grid. Shared by the dashboard and the per-user page. */
export function StatTile({ label, value, hint }: Props) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </Card>
  )
}
