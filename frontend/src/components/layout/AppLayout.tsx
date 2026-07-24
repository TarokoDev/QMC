import { ArrowLeft } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { AppHeader } from '@/components/layout/AppHeader'

export function AppLayout() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <div className="flex h-svh flex-col bg-background">
      <AppHeader />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
        {!isHome && (
          <Link
            to="/"
            className="mb-4 inline-flex shrink-0 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
        )}
        <div className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
