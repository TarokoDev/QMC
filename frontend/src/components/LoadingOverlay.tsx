import { Loader2 } from 'lucide-react'

interface Props {
  message: string
}

/** Full-screen blocking overlay with blur — use while a long async action finishes. */
export function LoadingOverlay({ message }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-2 rounded-lg border bg-background px-4 py-3 text-sm shadow-sm">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {message}
      </div>
    </div>
  )
}
