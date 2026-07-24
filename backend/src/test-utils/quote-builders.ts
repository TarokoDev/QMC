import type { AreaOfWorkDTO, LineItemDTO, QuoteDTO, QuoteSectionDTO } from '../types.js'

/**
 * Fixture builders for backend quote tests (DTO shapes).
 *
 * Every field has a sensible "happy path" default, so a test only overrides
 * the fields the rule under test cares about. Mirrors
 * frontend/src/test-utils/quote-builders.ts — kept separate on purpose, the
 * workspaces have no shared package yet (see src/types.ts header comment).
 */

export function makeItemDTO(overrides: Partial<LineItemDTO> = {}): LineItemDTO {
  return {
    id: 'item-1',
    description: 'Test item',
    qty: 1,
    unit: 'Lot',
    cost: 100,
    selling: 150,
    foc: false,
    inc: true,
    ...overrides,
  }
}

export function makeAreaDTO(overrides: Partial<AreaOfWorkDTO> = {}): AreaOfWorkDTO {
  return {
    id: 'area-1',
    name: 'Living Room',
    included: true,
    items: [makeItemDTO()],
    ...overrides,
  }
}

export function makeSectionDTO(overrides: Partial<QuoteSectionDTO> = {}): QuoteSectionDTO {
  return {
    id: 'sec-1',
    name: 'Section A',
    description: '',
    complete: true,
    areas: [makeAreaDTO()],
    ...overrides,
  }
}

export function makeQuoteDTO(overrides: Partial<QuoteDTO> = {}): QuoteDTO {
  return {
    info: {
      clientName: 'Acme Renovations',
      projectSite: 'Blk 123 Test Street',
      email: 'acme@example.com',
      contact: '91234567',
      quotationRef: 'R0',
      refNumber: 'Q-001',
      date: '2026-01-01',
      designer: 'Kim Hoe',
    },
    sections: [makeSectionDTO()],
    ...overrides,
  }
}
