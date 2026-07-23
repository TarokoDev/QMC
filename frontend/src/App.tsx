import { Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { CategoryLibraryProvider } from '@/lib/category-library-context'
import { SettingsProvider, useSettingsLoading } from '@/lib/settings-context'
import { CategoryList } from '@/pages/CategoryList'
import { ClientList } from '@/pages/ClientList'
import { Folders } from '@/pages/Folders'
import { Home } from '@/pages/Home'
import { MasterTemplateEditor } from '@/pages/MasterTemplateEditor'
import { CategoryEditor } from '@/pages/QuoteEditor/CategoryEditor'
import { ClientEditor } from '@/pages/QuoteEditor/ClientEditor'

function AppRoutes() {
  const settingsLoading = useSettingsLoading()

  if (settingsLoading) {
    return <div className="flex h-svh items-center justify-center text-sm text-muted-foreground">Loading...</div>
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/quotes/new/category" element={<Folders />} />
        <Route path="/quotes/new/category/:folderId" element={<CategoryList />} />
        <Route path="/quotes/new/category/:folderId/:categoryId" element={<ClientList />} />
        <Route path="/quotes/edit/category/:categoryId" element={<CategoryEditor />} />
        <Route path="/quotes/edit/client/:clientId" element={<ClientEditor />} />
        <Route path="/master-template" element={<MasterTemplateEditor />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <SettingsProvider>
      <CategoryLibraryProvider>
        <AppRoutes />
      </CategoryLibraryProvider>
    </SettingsProvider>
  )
}

export default App
