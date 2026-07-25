import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import { CategoryLibraryProvider } from '@/lib/category-library-context'
import { SettingsProvider, useSettingsLoading } from '@/lib/settings-context'
import { CategoryList } from '@/pages/CategoryList'
import { ClientList } from '@/pages/ClientList'
import { Folders } from '@/pages/Folders'
import { Home } from '@/pages/Home'
import { Login } from '@/pages/Login'
import { MasterTemplateEditor } from '@/pages/MasterTemplateEditor'
import { ProfileSettings } from '@/pages/ProfileSettings'
import { CategoryEditor } from '@/pages/QuoteEditor/CategoryEditor'
import { ClientEditor } from '@/pages/QuoteEditor/ClientEditor'

function AuthedRoutes() {
  const settingsLoading = useSettingsLoading()

  if (settingsLoading) {
    return <div className="flex h-svh items-center justify-center text-sm text-muted-foreground">Loading...</div>
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/quotes/new/category" element={<Folders />} />
        <Route path="/quotes/new/category/:folderId" element={<CategoryList />} />
        <Route path="/quotes/new/category/:folderId/:categoryId" element={<ClientList />} />
        <Route path="/quotes/edit/category/:categoryId" element={<CategoryEditor />} />
        <Route path="/quotes/edit/client/:clientId" element={<ClientEditor />} />
        <Route path="/master-template" element={<MasterTemplateEditor />} />
        <Route path="/profile" element={<ProfileSettings />} />
      </Route>
    </Routes>
  )
}

function AppRoutes() {
  const { session, loading, demoResetting } = useAuth()

  if (loading) {
    return <div className="flex h-svh items-center justify-center text-sm text-muted-foreground">Loading...</div>
  }

  // Signed-out visitors are parked on /login rather than shown the form in
  // place, so signing in lands on the dashboard instead of resuming whatever
  // deep route the tab happened to be on (which may no longer exist).
  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  if (demoResetting) {
    return <LoadingOverlay message="Preparing demo playground…" />
  }

  return (
    <SettingsProvider>
      <CategoryLibraryProvider>
        <AuthedRoutes />
      </CategoryLibraryProvider>
    </SettingsProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
