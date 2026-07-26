import { format } from 'date-fns'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Breadcrumb } from '@/components/Breadcrumb'
import { LoadErrorState } from '@/components/LoadErrorState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  type AdminUser,
  type AuthEvent,
  type GlobalMetrics,
  fetchAdminUsers,
  fetchAuthEvents,
  fetchGlobalMetrics,
} from '@/lib/auth-event-service'
import { AuthEventTable, roleVariant } from '@/pages/Admin/AuthEventTable'
import { DateRangeFilter } from '@/pages/Admin/DateRangeFilter'
import { StatTile } from '@/pages/Admin/StatTile'
import { useDateRange } from '@/pages/Admin/use-date-range'

const PAGE_SIZE = 50

export function AdminDashboard() {
  const { from, to, setFrom, setTo, range, invalid } = useDateRange()

  const [metrics, setMetrics] = useState<GlobalMetrics | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [userError, setUserError] = useState<string | null>(null)
  const [events, setEvents] = useState<AuthEvent[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async ({ refresh = false } = {}) => {
      if (invalid) return
      if (refresh) setRefreshing(true)
      else setLoading(true)
      setError(null)

      try {
        // The user directory is the only part that depends on Supabase being
        // reachable, so its failure is reported on its own rather than blanking
        // the whole page.
        const [nextMetrics, page, directory] = await Promise.all([
          fetchGlobalMetrics(range),
          fetchAuthEvents({ limit: PAGE_SIZE, ...range }),
          fetchAdminUsers({ refresh }).catch((err: unknown) => {
            setUserError(err instanceof Error ? err.message : 'Could not load the user directory.')
            return { users: [] as AdminUser[] }
          }),
        ])
        setMetrics(nextMetrics)
        setEvents(page.events)
        setNextCursor(page.nextCursor)
        if (directory.users.length > 0) {
          setUsers(directory.users)
          setUserError(null)
        }
        setLastUpdated(new Date())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load the admin dashboard.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [invalid, range],
  )

  useEffect(() => {
    void load()
  }, [load])

  async function loadMore() {
    if (!nextCursor) return
    setLoadingMore(true)
    try {
      const page = await fetchAuthEvents({ limit: PAGE_SIZE, cursor: nextCursor, ...range })
      setEvents((current) => [...current, ...page.events])
      setNextCursor(page.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load more events.')
    } finally {
      setLoadingMore(false)
    }
  }

  if (error && events.length === 0) {
    return (
      <div className="flex h-full flex-col overflow-y-auto">
        <Breadcrumb items={[{ label: 'Admin' }]} />
        <LoadErrorState message={error} onRetry={() => void load()} />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <Breadcrumb items={[{ label: 'Admin' }]} />

      <DateRangeFilter
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        invalid={invalid}
        onRefresh={() => void load({ refresh: true })}
        refreshing={refreshing}
        lastUpdated={lastUpdated}
      />

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Active users" value={metrics?.activeUsers ?? 0} hint="in range" />
        <StatTile label="Logins" value={metrics?.logins ?? 0} hint="in range" />
        <StatTile label="Auth events" value={metrics?.totalEvents ?? 0} hint="all time" />
        <StatTile label="Folders" value={metrics?.folders ?? 0} />
        <StatTile label="Clients" value={metrics?.clients ?? 0} />
        <StatTile label="Revisions" value={metrics?.revisions ?? 0} />
      </div>

      <p className="mt-6 mb-3 text-sm font-medium">Users</p>

      {userError ? (
        <p className="mb-3 text-sm text-destructive">{userError}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="border px-3 py-1.5 text-left font-medium whitespace-nowrap">User</th>
                <th className="border px-3 py-1.5 text-left font-medium whitespace-nowrap">Role</th>
                <th className="border px-3 py-1.5 text-left font-medium whitespace-nowrap">Last seen</th>
                <th className="border px-3 py-1.5 text-right font-medium whitespace-nowrap">Logins</th>
                <th className="border px-3 py-1.5 text-right font-medium whitespace-nowrap">Logouts</th>
                <th className="border px-3 py-1.5 text-left font-medium whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="border px-3 py-1.5 whitespace-nowrap">
                    {user.email}
                    {user.deleted && <span className="ml-2 text-xs text-muted-foreground">removed</span>}
                  </td>
                  <td className="border px-3 py-1.5">
                    <Badge variant={roleVariant(user.role)}>{user.role}</Badge>
                  </td>
                  <td className="border px-3 py-1.5 whitespace-nowrap tabular-nums text-muted-foreground">
                    {user.lastSeen ? format(new Date(user.lastSeen), 'd MMM yyyy, HH:mm') : 'Never'}
                  </td>
                  <td className="border px-3 py-1.5 text-right tabular-nums">{user.logins}</td>
                  <td className="border px-3 py-1.5 text-right tabular-nums">{user.logouts}</td>
                  <td className="border px-3 py-1.5 whitespace-nowrap">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/admin/users/${user.id}`}>View</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 mb-3 text-sm font-medium">Sign-in activity</p>

      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <AuthEventTable
        events={events}
        loading={loading}
        nextCursor={nextCursor}
        loadingMore={loadingMore}
        onLoadMore={() => void loadMore()}
      />
    </div>
  )
}
