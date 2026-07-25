import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  message: string
  onRetry: () => void
}

/**
 * Shown when a data load fails, so a failed request never renders as an empty
 * grid that reads like "you have no data".
 */
export function LoadErrorState({ message, onRetry }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <AlertCircle className="size-8 text-destructive" />
      <div>
        <p className="text-sm font-medium">Couldn't load your data.</p>
        <p className="mt-1 text-xs text-muted-foreground">{message}</p>
      </div>
      <Button variant="outline" onClick={onRetry}>
        Retry
      </Button>
    </div>
  )
}
