import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { useAuth, useCurrentUser, useIsDemoUser } from '@/lib/auth-context'
import { resetDemoPlayground } from '@/lib/demo-service'

export function AppHeader() {
  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const { signOut } = useAuth()
  const isDemoUser = useIsDemoUser()
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [resetting, setResetting] = useState(false)

  async function handleLogout() {
    setMenuOpen(false)
    setSigningOut(true)
    try {
      if (isDemoUser) {
        // Best-effort — a reset failure should never block logging out.
        await resetDemoPlayground().catch((err) => console.error('Demo reset on logout failed:', err))
      }
      await signOut()
    } catch (err) {
      console.error('Sign out failed:', err)
      setSigningOut(false)
    }
  }

  async function handleResetPlayground() {
    setMenuOpen(false)
    setResetting(true)
    try {
      await resetDemoPlayground()
      // Full reload at the root, not reload() — the current route may point at
      // a client/category the reset just deleted.
      window.location.href = '/'
    } catch (err) {
      console.error('Demo reset failed:', err)
      setResetting(false)
    }
  }

  return (
    <>
      {(signingOut || resetting) && (
        <LoadingOverlay message={signingOut ? 'Signing out…' : 'Resetting playground…'} />
      )}
      <header className="flex items-center justify-between border-b px-6 py-4">
        <Link to="/" className="flex items-center gap-2 font-heading text-xl font-semibold">
          <img src="/logo.png" alt="" className="size-8 rounded-md" />
          Quote Management System
        </Link>
        <div className="flex items-center gap-3">
          {isDemoUser && <Badge variant="secondary">Demo Mode</Badge>}
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="flex items-center gap-3" disabled={signingOut || resetting}>
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
                  onClick={handleResetPlayground}
                >
                  Reset Playground
                </button>
              )}
              <button
                type="button"
                className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                disabled={signingOut}
                onClick={handleLogout}
              >
                Logout
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </header>
    </>
  )
}
