import type { AreaOfWork, LineItem, Quote, QuoteSection } from '@/lib/mock-data'

/**
 * Fixture builders for quote tests.
 *
 * Every field has a sensible "happy path" default (included, non-FOC,
 * complete), so a test only overrides the fields the business rule under
 * test cares about. This keeps the test body a readable statement of the
 * rule, e.g.:
 *
 *   sectionTotals(makeSection({ areas: [makeArea({ items: [makeItem({ foc: true })] })] }))
 */

export function makeItem(overrides: Partial<LineItem> = {}): LineItem {
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

export function makeArea(overrides: Partial<AreaOfWork> = {}): AreaOfWork {
  return {
    id: 'area-1',
    name: 'Living Room',
    included: true,
    items: [makeItem()],
    ...overrides,
  }
}

export function makeSection(overrides: Partial<QuoteSection> = {}): QuoteSection {
  return {
    id: 'sec-1',
    name: 'Section A',
    description: '',
    complete: true,
    areas: [makeArea()],
    ...overrides,
  }
}

export function makeQuote(overrides: Partial<Quote> = {}): Quote {
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
    sections: [makeSection()],
    ...overrides,
  }
}
