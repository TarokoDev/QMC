import { api } from '@/lib/api-client'
import type { Quote } from '@/lib/mock-data'

export interface RevisionSummary {
  id: string
  clientId: string
  label: string
  position: number
}

export interface Revision extends RevisionSummary {
  quote: Quote
}

export function listRevisions(clientId: string): Promise<RevisionSummary[]> {
  return api.get(`/api/clients/${clientId}/revisions`)
}

export function cloneRevision(clientId: string, cloneFromRevisionId?: string): Promise<Revision> {
  return api.post(`/api/clients/${clientId}/revisions`, { cloneFromRevisionId })
}

export function getRevision(id: string): Promise<Revision> {
  return api.get(`/api/revisions/${id}`)
}

export function updateRevisionQuote(id: string, quote: Quote): Promise<Revision> {
  return api.put(`/api/revisions/${id}/quote`, { quote })
}

export function deleteRevision(id: string): Promise<void> {
  return api.delete(`/api/revisions/${id}`)
}
