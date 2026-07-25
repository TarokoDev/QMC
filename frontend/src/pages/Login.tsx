import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth-context'
import { AppFooter } from '@/components/layout/AppFooter'

const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL as string | undefined
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD as string | undefined

export function Login() {
  const { signIn, signInDemo } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [demoSubmitting, setDemoSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) setError(error)
  }

  async function handleDemoLogin() {
    if (!DEMO_EMAIL || !DEMO_PASSWORD) {
      setError('Demo account is not configured (VITE_DEMO_EMAIL/VITE_DEMO_PASSWORD).')
      return
    }
    setDemoSubmitting(true)
    setError(null)
    // Always start from a clean playground, regardless of how the last demo
    // session ended — signInDemo keeps the app gated until the reset lands.
    const { error } = await signInDemo(DEMO_EMAIL, DEMO_PASSWORD)
    setDemoSubmitting(false)
    if (error) setError(error)
  }

  return (
    <div className="flex h-svh items-center justify-center">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4 rounded-xl border p-8">
        <div className="mx-auto flex w-fit flex-col items-center gap-3">
          <img src="/logo.png" alt="" className="aspect-square w-full rounded-xl" />
          <h1 className="whitespace-nowrap font-heading text-xl font-semibold">Quote Management System</h1>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-password">Password</Label>
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={submitting}>
          Log In
        </Button>

        <Button type="button" variant="outline" disabled={demoSubmitting} onClick={handleDemoLogin}>
          {demoSubmitting ? 'Loading Demo...' : 'Use Demo Account'}
        </Button>
      </form>
      <AppFooter />
    </div>
  )
}
