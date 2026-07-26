import { format } from 'date-fns'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Breadcrumb } from '@/components/Breadcrumb'
import { LoadErrorState } from '@/components/LoadErrorState'
import { Badge } from '@/components/ui/badge'
import {
  type AdminUser,
  type AuthEvent,
  type UserMetrics,
  fetchAdminUsers,
  fetchAuthEvents,
  fetchUserMetrics,
} from '@/lib/auth-event-service'
import { formatMoney } from '@/lib/quote-calculations'
import { useSettings } from '@/lib/settings-context'
import { AuthEventTable, roleVariant } from '@/pages/Admin/AuthEventTable'
import { DateRangeFilter } from '@/pages/Admin/DateRangeFilter'
import { StatTile } from '@/pages/Admin/StatTile'
import { UserDataBrowser } from '@/pages/Admin/UserDataBrowser'
import { useDateRange } from '@/pages/Admin/use-date-range'

type TabId = 'metrics' | 'activity' | 'data'

const TABS: { id: TabId; label: string }[] = [
  { id: 'metrics', label: 'Metrics' },
  { id: 'activity', label: 'Activity' },
  { id: 'data', label: 'Data' },
]

const PAGE_SIZE = 50

export function AdminUserDetail() {
  const { userId = '' } = useParams<{ userId: string }>()
  const { currencySymbol } = useSettings()
  const { from, to, setFrom, setTo, range, invalid } = useDateRange()

  const [activeTab, setActiveTab] = useState<TabId>('metrics')
  const [user, setUser] = useState<AdminUser | null>(null)
  const [metrics, setMetrics] = useState<UserMetrics | null>(null)
  const [events, setEvents] = useState<AuthEvent[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async ({ refresh = false } = {}) => {
      if (invalid || !userId) return
      if (refresh) setRefreshing(true)
      else setLoading(true)
      setError(null)

      try {
        const [nextMetrics, page, directory] = await Promise.all([
          fetchUserMetrics(userId, range),
          fetchAuthEvents({ limit: PAGE_SIZE, authUserId: userId, ...range }),
          // Only for the header (email/role) — a directory outage should not
          // hide the metrics, which come from our own DB.
          fetchAdminUsers({ refresh }).catch(() => ({ users: [] as AdminUser[] })),
        ])
        setMetrics(nextMetrics)
        setEvents(page.events)
        setNextCursor(page.nextCursor)
        setUser(directory.users.find((candidate) => candidate.id === userId) ?? null)
        setLastUpdated(new Date())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load this user.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [invalid, range, userId],
  )

  useEffect(() => {
    void load()
  }, [load])

  async function loadMore() {
    if (!nextCursor) return
    setLoadingMore(true)
    try {
      const page = await fetchAuthEvents({ limit: PAGE_SIZE, authUserId: userId, cursor: nextCursor, ...range })
      setEvents((current) => [...current, ...page.events])
      setNextCursor(page.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load more events.')
    } finally {
      setLoadingMore(false)
    }
  }

  const breadcrumb = [{ label: 'Admin', to: '/admin' }, { label: user?.email || userId }]

  if (error && !metrics) {
    return (
      <div className="flex h-full flex-col overflow-y-auto">
        <Breadcrumb items={breadcrumb} />
        <LoadErrorState message={error} onRetry={() => void load()} />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <Breadcrumb items={breadcrumb} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-medium">{user?.email || userId}</h1>
        {user && <Badge variant={roleVariant(user.role)}>{user.role}</Badge>}
        <span className="text-xs text-muted-foreground">
          Last seen {metrics?.lastSeen ? format(new Date(metrics.lastSeen), 'd MMM yyyy, HH:mm') : 'never'}
        </span>
        <Link to="/admin" className="ml-auto text-sm text-muted-foreground hover:text-foreground">
          Back to Admin
        </Link>
      </div>

      <div className="mb-4 flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={
              tab.id === activeTab
                ? 'rounded-lg border bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground'
                : 'rounded-lg border px-3 py-1.5 text-sm font-medium'
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab !== 'data' && (
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
      )}

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {activeTab === 'metrics' && (
        <div className="mt-4 flex flex-col gap-6">
          <section>
            <p className="mb-2 text-sm font-medium">Sign-in activity</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <StatTile label="Logins" value={metrics?.logins ?? 0} hint="in range" />
              <StatTile label="Logouts" value={metrics?.logouts ?? 0} hint="in range" />
              <StatTile
                label="Last seen"
                value={metrics?.lastSeen ? format(new Date(metrics.lastSeen), 'd MMM') : '—'}
                hint="all time"
              />
            </div>
          </section>

          <section>
            <p className="mb-2 text-sm font-medium">Portfolio</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatTile label="Folders" value={metrics?.folders ?? 0} />
              <StatTile label="Categories" value={metrics?.categories ?? 0} />
              <StatTile label="Clients" value={metrics?.clients ?? 0} />
              <StatTile label="Revisions" value={metrics?.revisions ?? 0} />
            </div>
          </section>

          <section>
            <p className="mb-2 text-sm font-medium">Output in range</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <StatTile label="Clients created" value={metrics?.clientsCreated ?? 0} />
              <StatTile label="Revisions created" value={metrics?.revisionsCreated ?? 0} />
            </div>
          </section>

          <section>
            <p className="mb-2 text-sm font-medium">Quoted value</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatTile label="Latest revisions" value={metrics?.latestRevisions ?? 0} hint="one per client" />
              <StatTile label="Sub total" value={formatMoney(metrics?.subTotal ?? 0, currencySymbol)} />
              <StatTile label="GST" value={formatMoney(metrics?.gst ?? 0, currencySymbol)} />
              <StatTile label="Grand total" value={formatMoney(metrics?.grandTotal ?? 0, currencySymbol)} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Sums the latest revision of every client this user owns — the one intended to go out. Older
              revisions are excluded so a quote is never counted twice.
            </p>
          </section>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="mt-4">
          <AuthEventTable
            events={events}
            loading={loading}
            nextCursor={nextCursor}
            loadingMore={loadingMore}
            onLoadMore={() => void loadMore()}
            showUser={false}
          />
        </div>
      )}

      {activeTab === 'data' && <UserDataBrowser userId={userId} />}
    </div>
  )
}
