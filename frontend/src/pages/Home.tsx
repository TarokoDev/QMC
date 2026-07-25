import { Link } from 'react-router-dom'
import { Card, CardTitle } from '@/components/ui/card'
import { AppFooter } from '@/components/layout/AppFooter'
import { useIsDemoUser } from '@/lib/auth-context'

export function Home() {
  const isDemoUser = useIsDemoUser()

  return (
    <div className="flex h-full flex-col items-center gap-6 overflow-y-auto pt-16">
      {isDemoUser && (
        <p className="mx-6 max-w-xl rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground">
          You&apos;re in demo mode with simulated data — explore freely. Changes reset when you log
          in or out. To restore a clean playground anytime, open your account menu and choose{' '}
          <span className="font-medium text-foreground">Reset Playground</span>. Have fun!
        </p>
      )}
      <div className="flex justify-center gap-6">
        <Link to="/quotes/new/category">
          <Card className="flex h-40 w-40 items-center justify-center text-center hover:bg-muted/50">
            <CardTitle className="px-4 text-base font-medium">Generate Quote</CardTitle>
          </Card>
        </Link>
        <Link to="/master-template">
          <Card className="flex h-40 w-40 items-center justify-center text-center hover:bg-muted/50">
            <CardTitle className="px-4 text-base font-medium">Master Template</CardTitle>
          </Card>
        </Link>
      </div>
      <AppFooter />
    </div>
  )
}
