import { ArrowLeft } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useCurrentUser } from '@/lib/settings-context'

export function AppHeader() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const currentUser = useCurrentUser()

  return (
    <header className="flex items-center justify-between border-b px-6 py-4">
      <div className="flex items-center gap-4">
        <Link to="/" className="font-heading text-xl font-semibold">
          Quote Management System
        </Link>
        {!isHome && (
          <Link
            to="/"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{currentUser.initials}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{currentUser.name}</span>
      </div>
    </header>
  )
}
