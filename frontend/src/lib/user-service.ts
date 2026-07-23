import { api } from '@/lib/api-client'

export interface CurrentUser {
  name: string
  initials: string
}

export function getCurrentUser(): Promise<CurrentUser> {
  return api.get('/api/me')
}
