import { Outlet } from 'react-router-dom'
import { AppHeader } from '@/components/layout/AppHeader'

export function AppLayout() {
  return (
    <div className="flex h-svh flex-col bg-background">
      <AppHeader />
      <main className="min-h-0 flex-1 overflow-hidden p-6">
        <Outlet />
      </main>
    </div>
  )
}
