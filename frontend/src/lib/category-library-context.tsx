import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Quote } from '@/lib/mock-data'
import * as service from '@/lib/category-library-service'
import type { Category, Folder } from '@/lib/category-library-service'

interface CategoryLibraryValue {
  folders: Folder[]
  categories: Category[]
  loading: boolean
  addFolder: (name: string) => Promise<Folder>
  renameFolder: (id: string, name: string) => Promise<void>
  deleteFolder: (id: string) => Promise<void>
  categoriesInFolder: (folderId: string) => Category[]
  getCategory: (id: string) => Category | undefined
  createCategory: (folderId: string, name: string, description?: string) => Promise<Category>
  duplicateCategory: (id: string, newName: string) => Promise<Category>
  updateCategory: (id: string, name: string, description?: string) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  updateCategoryQuote: (id: string, quote: Quote) => Promise<void>
}

const CategoryLibraryContext = createContext<CategoryLibraryValue | null>(null)

export function CategoryLibraryProvider({ children }: { children: ReactNode }) {
  const [folders, setFolders] = useState<Folder[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const loadedFolders = await service.listFolders()
      const loadedCategories = (
        await Promise.all(loadedFolders.map((folder) => service.listCategories(folder.id)))
      ).flat()
      if (cancelled) return
      setFolders(loadedFolders)
      setCategories(loadedCategories)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const addFolder = useCallback(async (name: string) => {
    const folder = await service.createFolder(name)
    setFolders((prev) => [...prev, folder])
    return folder
  }, [])

  const renameFolderFn = useCallback(async (id: string, name: string) => {
    await service.renameFolder(id, name)
    setFolders((prev) => prev.map((folder) => (folder.id === id ? { ...folder, name } : folder)))
  }, [])

  const deleteFolderFn = useCallback(async (id: string) => {
    await service.deleteFolder(id)
    setFolders((prev) => prev.filter((folder) => folder.id !== id))
    setCategories((prev) => prev.filter((category) => category.folderId !== id))
  }, [])

  const categoriesInFolder = useCallback(
    (folderId: string) => categories.filter((category) => category.folderId === folderId),
    [categories],
  )

  const getCategoryFn = useCallback((id: string) => categories.find((category) => category.id === id), [categories])

  const createCategoryFn = useCallback(async (folderId: string, name: string, description?: string) => {
    const category = await service.createCategory(folderId, name, description)
    setCategories((prev) => [...prev, category])
    return category
  }, [])

  const duplicateCategoryFn = useCallback(async (id: string, newName: string) => {
    const category = await service.duplicateCategory(id, newName)
    setCategories((prev) => [...prev, category])
    return category
  }, [])

  const updateCategoryFn = useCallback(async (id: string, name: string, description?: string) => {
    const updated = await service.updateCategory(id, name, description)
    setCategories((prev) => prev.map((category) => (category.id === id ? { ...category, ...updated } : category)))
  }, [])

  const deleteCategoryFn = useCallback(async (id: string) => {
    await service.deleteCategory(id)
    setCategories((prev) => prev.filter((category) => category.id !== id))
  }, [])

  const updateCategoryQuoteFn = useCallback(async (id: string, quote: Quote) => {
    await service.updateCategoryQuote(id, quote)
    setCategories((prev) => prev.map((category) => (category.id === id ? { ...category, quote } : category)))
  }, [])

  const value: CategoryLibraryValue = {
    folders,
    categories,
    loading,
    addFolder,
    renameFolder: renameFolderFn,
    deleteFolder: deleteFolderFn,
    categoriesInFolder,
    getCategory: getCategoryFn,
    createCategory: createCategoryFn,
    duplicateCategory: duplicateCategoryFn,
    updateCategory: updateCategoryFn,
    deleteCategory: deleteCategoryFn,
    updateCategoryQuote: updateCategoryQuoteFn,
  }

  return <CategoryLibraryContext.Provider value={value}>{children}</CategoryLibraryContext.Provider>
}

export function useCategoryLibrary() {
  const ctx = useContext(CategoryLibraryContext)
  if (!ctx) throw new Error('useCategoryLibrary must be used within a CategoryLibraryProvider')
  return ctx
}
