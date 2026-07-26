import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { AuthEvent } from '@/lib/auth-event-service'

interface Props {
  events: AuthEvent[]
  loading: boolean
  nextCursor: string | null
  loadingMore: boolean
  onLoadMore: () => void
  /** Hidden on the per-user page, where every row is the same person. */
  showUser?: boolean
}

export function roleVariant(role: string) {
  if (role === 'admin') return 'default' as const
  if (role === 'demo') return 'secondary' as const
  return 'outline' as const
}

export function AuthEventTable({ events, loading, nextCursor, loadingMore, onLoadMore, showUser = true }: Props) {
  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No sign-in activity in this date range.</p>
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="border px-3 py-1.5 text-left font-medium whitespace-nowrap">When</th>
              {showUser && <th className="border px-3 py-1.5 text-left font-medium whitespace-nowrap">User</th>}
              {showUser && <th className="border px-3 py-1.5 text-left font-medium whitespace-nowrap">Role</th>}
              <th className="border px-3 py-1.5 text-left font-medium whitespace-nowrap">Event</th>
              <th className="border px-3 py-1.5 text-left font-medium whitespace-nowrap">IP</th>
              <th className="border px-3 py-1.5 text-left font-medium">Device</th>
            </tr>
          </thead>
          <tbody>
            {events.map((row) => (
              <tr key={row.id}>
                <td className="border px-3 py-1.5 whitespace-nowrap tabular-nums">
                  {format(new Date(row.createdAt), 'd MMM yyyy, HH:mm:ss')}
                </td>
                {showUser && (
                  <td className="border px-3 py-1.5 whitespace-nowrap">
                    {row.email || <span className="text-muted-foreground">{row.authUserId}</span>}
                  </td>
                )}
                {showUser && (
                  <td className="border px-3 py-1.5">
                    <Badge variant={roleVariant(row.role)}>{row.role}</Badge>
                  </td>
                )}
                <td className="border px-3 py-1.5 whitespace-nowrap">
                  {row.event === 'login' ? 'Logged in' : 'Logged out'}
                </td>
                <td className="border px-3 py-1.5 whitespace-nowrap text-muted-foreground">{row.ipAddress ?? '—'}</td>
                <td
                  className="max-w-xs truncate border px-3 py-1.5 text-muted-foreground"
                  title={row.userAgent ?? undefined}
                >
                  {row.userAgent ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {nextCursor && (
        <div className="mt-3 flex justify-center">
          <Button variant="outline" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Load more'}
          </Button>
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Logouts are only recorded when someone signs out explicitly — a closed tab or an expired session
        leaves no logout row.
      </p>
    </>
  )
}
