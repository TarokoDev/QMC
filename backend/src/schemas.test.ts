import { describe, expect, it } from 'vitest'

import { clientBodySchema, putQuoteBodySchema, quoteSchema } from './schemas.js'
import { makeItemDTO, makeQuoteDTO, makeSectionDTO, makeAreaDTO } from './test-utils/quote-builders.js'

describe('quoteSchema', () => {
  it('accepts a fully valid quote DTO', () => {
    expect(quoteSchema.safeParse(makeQuoteDTO()).success).toBe(true)
  })

  it('rejects an unknown unit', () => {
    const quote = makeQuoteDTO({
      sections: [makeSectionDTO({ areas: [makeAreaDTO({ items: [{ ...makeItemDTO(), unit: 'Metre' as never }] })] })],
    })
    expect(quoteSchema.safeParse(quote).success).toBe(false)
  })

  it('rejects a string qty', () => {
    const quote = makeQuoteDTO({
      sections: [makeSectionDTO({ areas: [makeAreaDTO({ items: [{ ...makeItemDTO(), qty: '2' as never }] })] })],
    })
    expect(quoteSchema.safeParse(quote).success).toBe(false)
  })

  it('rejects a missing foc/inc flag', () => {
    const { foc: _foc, ...itemWithoutFoc } = makeItemDTO()
    const quote = makeQuoteDTO({
      sections: [makeSectionDTO({ areas: [makeAreaDTO({ items: [itemWithoutFoc as never] })] })],
    })
    expect(quoteSchema.safeParse(quote).success).toBe(false)
  })

  // Pinned known gap (see CLAUDE.md backlog candidates): qty/cost/selling
  // have no .positive()/.finite() refinement yet, so nonsense numbers pass
  // validation. If the schema is ever tightened, these two tests should be
  // flipped deliberately, not deleted.
  it('KNOWN GAP: currently accepts negative qty and cost', () => {
    const quote = makeQuoteDTO({
      sections: [makeSectionDTO({ areas: [makeAreaDTO({ items: [makeItemDTO({ qty: -5, cost: -10 })] })] })],
    })
    expect(quoteSchema.safeParse(quote).success).toBe(true)
  })

  it('KNOWN GAP: currently accepts Infinity selling', () => {
    const quote = makeQuoteDTO({
      sections: [makeSectionDTO({ areas: [makeAreaDTO({ items: [makeItemDTO({ selling: Infinity })] })] })],
    })
    expect(quoteSchema.safeParse(quote).success).toBe(true)
  })
})

describe('putQuoteBodySchema', () => {
  it('requires the quote to be wrapped in a { quote } body', () => {
    expect(putQuoteBodySchema.safeParse({ quote: makeQuoteDTO() }).success).toBe(true)
    expect(putQuoteBodySchema.safeParse(makeQuoteDTO()).success).toBe(false)
  })
})

describe('clientBodySchema', () => {
  it('defaults source to "scratch" when omitted', () => {
    const parsed = clientBodySchema.parse({ name: 'New Client' })
    expect(parsed.source).toBe('scratch')
  })

  it('accepts "master" as a source', () => {
    expect(clientBodySchema.parse({ name: 'New Client', source: 'master' }).source).toBe('master')
  })

  it('rejects an empty name', () => {
    expect(clientBodySchema.safeParse({ name: '' }).success).toBe(false)
  })
})
