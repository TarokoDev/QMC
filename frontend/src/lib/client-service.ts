import { api } from '@/lib/api-client'

export interface Client {
  id: string
  categoryId: string
  name: string
  email: string
  contactNumber: string
}

export function listClients(categoryId: string): Promise<Client[]> {
  return api.get(`/api/categories/${categoryId}/clients`)
}

export type ClientQuoteSource = 'master' | 'scratch'

export function createClient(
  categoryId: string,
  name: string,
  email: string,
  contactNumber: string,
  source: ClientQuoteSource,
): Promise<Client> {
  return api.post(`/api/categories/${categoryId}/clients`, { name, email, contactNumber, source })
}

export function getClient(id: string): Promise<Client> {
  return api.get(`/api/clients/${id}`)
}

export function updateClient(id: string, name: string, email: string, contactNumber: string): Promise<Client> {
  return api.patch(`/api/clients/${id}`, { name, email, contactNumber })
}

export function deleteClient(id: string): Promise<void> {
  return api.delete(`/api/clients/${id}`)
}
