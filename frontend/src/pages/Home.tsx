import { Link } from 'react-router-dom'
import { Card, CardTitle } from '@/components/ui/card'
import { AppFooter } from '@/components/layout/AppFooter'

export function Home() {
  return (
    <div className="flex h-full justify-center gap-6 overflow-y-auto pt-16">
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
      <AppFooter />
    </div>
  )
}
