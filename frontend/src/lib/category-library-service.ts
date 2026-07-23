import { api } from '@/lib/api-client'
import type { Quote } from '@/lib/mock-data'

export interface Folder {
  id: string
  name: string
}

export interface Category {
  id: string
  folderId: string
  name: string
  description: string
  quote: Quote
}

export function listFolders(): Promise<Folder[]> {
  return api.get('/api/folders')
}

export function createFolder(name: string): Promise<Folder> {
  return api.post('/api/folders', { name })
}

export function renameFolder(id: string, name: string): Promise<Folder> {
  return api.patch(`/api/folders/${id}`, { name })
}

export function deleteFolder(id: string): Promise<void> {
  return api.delete(`/api/folders/${id}`)
}

export function listCategories(folderId: string): Promise<Category[]> {
  return api.get(`/api/folders/${folderId}/categories`)
}

export async function getCategory(id: string): Promise<Category | undefined> {
  try {
    return await api.get<Category>(`/api/categories/${id}`)
  } catch (err) {
    if (err instanceof Error && 'status' in err && (err as { status: number }).status === 404) return undefined
    throw err
  }
}

export function createCategory(folderId: string, name: string, description?: string): Promise<Category> {
  return api.post(`/api/folders/${folderId}/categories`, { name, description })
}

export function duplicateCategory(id: string, newName: string): Promise<Category> {
  return api.post(`/api/categories/${id}/duplicate`, { name: newName })
}

export function updateCategory(id: string, name: string, description?: string): Promise<Category> {
  return api.patch(`/api/categories/${id}`, { name, description })
}

export function deleteCategory(id: string): Promise<void> {
  return api.delete(`/api/categories/${id}`)
}

export function updateCategoryQuote(id: string, quote: Quote): Promise<Category> {
  return api.put(`/api/categories/${id}/quote`, { quote })
}
