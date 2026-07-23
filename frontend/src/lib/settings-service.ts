import { api } from '@/lib/api-client'
import type { CompanyInfo, Unit } from '@/lib/mock-data'

export interface PaymentTerm {
  label: string
  percent: number
}

export interface Settings {
  company: CompanyInfo
  currency: string
  currencySymbol: string
  gstRate: number
  unitOptions: { value: Unit; label: string }[]
  paymentTermsSchedule: PaymentTerm[]
}

export function getSettings(): Promise<Settings> {
  return api.get('/api/settings')
}
