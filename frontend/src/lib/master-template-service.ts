import { api } from '@/lib/api-client'
import type { Quote } from '@/lib/mock-data'

export interface MasterTemplate {
  id: string
  updatedAt: string
  quote: Quote
}

export function getMasterTemplate(): Promise<MasterTemplate> {
  return api.get('/api/master-template')
}

export function updateMasterTemplateQuote(quote: Quote): Promise<MasterTemplate> {
  return api.put('/api/master-template/quote', { quote })
}
