import type { AreaOfWork, Category, LineItem, Quote, QuoteSection, Revision } from '@prisma/client'
import type {
  AreaOfWorkDTO,
  CategoryDTO,
  ClientDTO,
  LineItemDTO,
  MasterTemplateDTO,
  QuoteDTO,
  RevisionDocumentDTO,
  QuoteSectionDTO,
  RevisionDTO,
  RevisionSummaryDTO,
  Unit,
} from './types.js'

type LineItemRow = LineItem
type AreaRow = AreaOfWork & { items: LineItemRow[] }
type SectionRow = QuoteSection & { areas: AreaRow[] }
type QuoteRow = Quote & { sections: SectionRow[] }
type CategoryRow = Category & { quote: QuoteRow | null }
type RevisionRow = Revision & { quote: QuoteRow | null }
type MasterTemplateRow = { id: string; updatedAt: Date; quote: QuoteRow | null }

function toLineItemDTO(item: LineItemRow): LineItemDTO {
  return {
    id: item.id,
    description: item.description,
    qty: Number(item.qty),
    unit: item.unit as Unit,
    cost: Number(item.cost),
    selling: Number(item.selling),
    foc: item.foc,
    inc: item.inc,
  }
}

function toAreaDTO(area: AreaRow): AreaOfWorkDTO {
  return {
    id: area.id,
    name: area.name,
    included: area.included,
    items: [...area.items].sort((a, b) => a.position - b.position).map(toLineItemDTO),
  }
}

function toSectionDTO(section: SectionRow): QuoteSectionDTO {
  return {
    id: section.id,
    name: section.name,
    description: section.description,
    complete: section.complete,
    areas: [...section.areas].sort((a, b) => a.position - b.position).map(toAreaDTO),
  }
}

export function toQuoteDTO(quote: QuoteRow): QuoteDTO {
  return {
    info: {
      clientName: quote.clientName,
      projectSite: quote.projectSite,
      email: quote.email,
      contact: quote.contact,
      quotationRef: quote.quotationRef,
      refNumber: quote.refNumber,
      date: quote.date,
      designer: quote.designer,
      designerContact: quote.designerContact,
    },
    sections: [...quote.sections].sort((a, b) => a.position - b.position).map(toSectionDTO),
  }
}

export const BLANK_QUOTE: QuoteDTO = {
  info: {
    clientName: '',
    projectSite: '',
    email: '',
    contact: '',
    quotationRef: 'R0',
    refNumber: '',
    date: '',
    designer: '',
    designerContact: '',
  },
  sections: [],
}

export function toCategoryDTO(category: CategoryRow): CategoryDTO {
  return {
    id: category.id,
    folderId: category.folderId,
    name: category.name,
    description: category.description,
    quote: category.quote ? toQuoteDTO(category.quote) : BLANK_QUOTE,
  }
}

export function toClientDTO(client: {
  id: string
  categoryId: string
  name: string
  email: string
  contactNumber: string
}): ClientDTO {
  return {
    id: client.id,
    categoryId: client.categoryId,
    name: client.name,
    email: client.email,
    contactNumber: client.contactNumber,
  }
}

export function toMasterTemplateDTO(masterTemplate: MasterTemplateRow): MasterTemplateDTO {
  return {
    id: masterTemplate.id,
    updatedAt: masterTemplate.updatedAt.toISOString(),
    quote: masterTemplate.quote ? toQuoteDTO(masterTemplate.quote) : BLANK_QUOTE,
  }
}

export function toRevisionSummaryDTO(revision: {
  id: string
  clientId: string
  label: string
  position: number
  quote: { updatedAt: Date } | null
}): RevisionSummaryDTO {
  return {
    id: revision.id,
    clientId: revision.clientId,
    label: revision.label,
    position: revision.position,
    updatedAt: revision.quote ? revision.quote.updatedAt.toISOString() : null,
  }
}

export function toRevisionDTO(revision: RevisionRow): RevisionDTO {
  return {
    ...toRevisionSummaryDTO(revision),
    quote: revision.quote ? toQuoteDTO(revision.quote) : BLANK_QUOTE,
  }
}

export function toRevisionDocumentDTO(document: {
  id: string
  revisionId: string
  fileName: string
  contentType: string
  sizeBytes: number
  createdAt: Date
}): RevisionDocumentDTO {
  return {
    id: document.id,
    revisionId: document.revisionId,
    fileName: document.fileName,
    contentType: document.contentType,
    sizeBytes: document.sizeBytes,
    createdAt: document.createdAt.toISOString(),
  }
}

export const quoteInclude = {
  include: {
    sections: {
      include: {
        areas: {
          include: { items: true },
        },
      },
    },
  },
} as const

export const categoryInclude = {
  quote: quoteInclude,
} as const

export const revisionInclude = {
  quote: quoteInclude,
} as const

export const masterTemplateInclude = {
  quote: quoteInclude,
} as const
