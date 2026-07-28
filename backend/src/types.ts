// Mirrors frontend/src/lib/mock-data.ts + category-library-service.ts.
// No shared package yet (prototype stage) — keep these in sync by hand.

export type Unit = 'Ft' | 'Lot' | 'SqFt'

export interface LineItemDTO {
  id: string
  description: string
  qty: number
  unit: Unit
  cost: number
  selling: number
  foc: boolean
  inc: boolean
}

export interface AreaOfWorkDTO {
  id: string
  name: string
  included: boolean
  items: LineItemDTO[]
}

export interface QuoteSectionDTO {
  id: string
  name: string
  description: string
  complete: boolean
  areas: AreaOfWorkDTO[]
}

export interface QuoteDTO {
  info: {
    clientName: string
    projectSite: string
    email: string
    contact: string
    quotationRef: string
    refNumber: string
    date: string
    designer: string
    designerContact: string
  }
  sections: QuoteSectionDTO[]
}

export interface CategoryDTO {
  id: string
  folderId: string
  name: string
  description: string
  quote: QuoteDTO
}

export interface MasterTemplateDTO {
  id: string
  updatedAt: string
  quote: QuoteDTO
}

export interface FolderDTO {
  id: string
  name: string
}

export interface ClientDTO {
  id: string
  categoryId: string
  name: string
  email: string
  contactNumber: string
}

export interface RevisionSummaryDTO {
  id: string
  clientId: string
  label: string
  position: number
  updatedAt: string | null
}

export interface RevisionDTO extends RevisionSummaryDTO {
  quote: QuoteDTO
}

export interface RevisionDocumentDTO {
  id: string
  revisionId: string
  fileName: string
  contentType: string
  sizeBytes: number
  createdAt: string
}

/**
 * Answer to "I want to upload this file". The browser then PUTs the bytes
 * straight to Supabase Storage at `storagePath` and calls the confirm route.
 * `storagePath` appears here and nowhere else — the key layout stays an
 * implementation detail everywhere it is not strictly needed.
 */
export interface DocumentUploadTicketDTO {
  document: RevisionDocumentDTO
  bucket: string
  storagePath: string
}

export interface DocumentDownloadDTO {
  url: string
  expiresIn: number
}
