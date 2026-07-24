import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAuth, useCurrentUser } from '@/lib/auth-context'

export function AppHeader() {
  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const { signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

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
            <button
              type="button"
              className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => {
                setMenuOpen(false)
                signOut()
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
