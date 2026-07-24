import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAuth, useCurrentUser, useIsDemoUser } from '@/lib/auth-context'
import { resetDemoPlayground } from '@/lib/demo-service'

export function AppHeader() {
  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const { signOut } = useAuth()
  const isDemoUser = useIsDemoUser()
  const [menuOpen, setMenuOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  async function handleLogout() {
    if (isDemoUser) {
      // Best-effort — a reset failure should never block logging out.
      await resetDemoPlayground().catch((err) => console.error('Demo reset on logout failed:', err))
    }
    await signOut()
  }

  async function handleResetPlayground() {
    setResetting(true)
    await resetDemoPlayground()
    window.location.reload()
  }

  return (
    <header className="flex items-center justify-between border-b px-6 py-4">
      <Link to="/" className="font-heading text-xl font-semibold">
        Quote Management System
      </Link>
      <div className="flex items-center gap-3">
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>{currentUser.initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{currentUser.name}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48">
            <button
              type="button"
              className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => {
                setMenuOpen(false)
                navigate('/profile')
              }}
            >
              Profile Settings
            </button>
            {isDemoUser && (
              <button
                type="button"
                className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                disabled={resetting}
                onClick={() => {
                  setMenuOpen(false)
                  handleResetPlayground()
                }}
              >
                {resetting ? 'Resetting...' : 'Reset Playground'}
              </button>
            )}
            <button
              type="button"
              className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => {
                setMenuOpen(false)
                handleLogout()
              }}
            >
              Logout
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  )
}
