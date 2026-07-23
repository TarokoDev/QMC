export type Unit = 'Ft' | 'Lot' | 'SqFt'

export interface LineItem {
  id: string
  description: string
  qty: number
  unit: Unit
  cost: number
  selling: number
  foc: boolean
  inc: boolean
}

export interface AreaOfWork {
  id: string
  name: string
  included: boolean
  items: LineItem[]
}

export interface QuoteSection {
  id: string
  name: string
  description: string
  complete: boolean
  areas: AreaOfWork[]
}

export interface QuoteInfo {
  clientName: string
  projectSite: string
  email: string
  contact: string
  quotationRef: string
  refNumber: string
  date: string
  designer: string
}

export interface CompanyInfo {
  name: string
  address: string
  tel: string
  uen: string
  gst: string
  website: string
}

export interface Quote {
  info: QuoteInfo
  sections: QuoteSection[]
}
