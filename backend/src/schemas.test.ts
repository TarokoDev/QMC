import { describe, expect, it } from 'vitest'

import {
  adminMetricsQuerySchema,
  createDocumentBodySchema,
  authEventBodySchema,
  authEventQuerySchema,
  clientBodySchema,
  putQuoteBodySchema,
  quoteSchema,
} from './schemas.js'
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

describe('authEventBodySchema', () => {
  it('accepts the two known event kinds', () => {
    expect(authEventBodySchema.parse({ event: 'login' }).event).toBe('login')
    expect(authEventBodySchema.parse({ event: 'logout' }).event).toBe('logout')
  })

  it('rejects an unknown event kind', () => {
    expect(authEventBodySchema.safeParse({ event: 'impersonate' }).success).toBe(false)
  })

  // Identity comes from the verified JWT; anything the caller sends about who
  // the event belongs to is stripped rather than trusted.
  it('drops any actor fields supplied by the caller', () => {
    const parsed = authEventBodySchema.parse({ event: 'login', authUserId: 'someone-else', role: 'admin' })
    expect(parsed).toEqual({ event: 'login' })
  })
})

describe('authEventQuerySchema', () => {
  it('defaults limit to 50 and coerces the query string number', () => {
    expect(authEventQuerySchema.parse({}).limit).toBe(50)
    expect(authEventQuerySchema.parse({ limit: '25' }).limit).toBe(25)
  })

  it('rejects a limit above the 100 cap', () => {
    expect(authEventQuerySchema.safeParse({ limit: '500' }).success).toBe(false)
  })
})

describe('admin date ranges', () => {
  it('defaults to the last 30 days when no range is given', () => {
    const { from, to } = adminMetricsQuerySchema.parse({})
    const days = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)
    expect(Math.round(days)).toBe(30)
  })

  // An inverted range would return nothing, which reads as "this user did
  // nothing" rather than "you typed the dates backwards".
  it('rejects a range that ends before it starts', () => {
    const inverted = { from: '2026-07-20T00:00:00.000Z', to: '2026-07-01T00:00:00.000Z' }
    expect(adminMetricsQuerySchema.safeParse(inverted).success).toBe(false)
    expect(authEventQuerySchema.safeParse(inverted).success).toBe(false)
  })

  it('keeps an explicit range as given', () => {
    const parsed = adminMetricsQuerySchema.parse({ from: '2026-07-01T00:00:00.000Z', to: '2026-07-20T00:00:00.000Z' })
    expect(parsed.from.toISOString()).toBe('2026-07-01T00:00:00.000Z')
    expect(parsed.to.toISOString()).toBe('2026-07-20T00:00:00.000Z')
  })

  it('treats an absent authUserId as project-wide', () => {
    expect(adminMetricsQuerySchema.parse({}).authUserId).toBeUndefined()
    expect(adminMetricsQuerySchema.parse({ authUserId: 'uid-1' }).authUserId).toBe('uid-1')
  })
})

describe('createDocumentBodySchema', () => {
  const file = { fileName: 'signed-quote.pdf', contentType: 'application/pdf', sizeBytes: 1024 }

  it('accepts an ordinary upload', () => {
    expect(createDocumentBodySchema.parse(file)).toEqual(file)
  })

  it('falls back to a generic content type — SketchUp files arrive without one', () => {
    const { fileName, sizeBytes } = file
    expect(createDocumentBodySchema.parse({ fileName, sizeBytes }).contentType).toBe(
      'application/octet-stream',
    )
  })

  it('rejects a file one byte over the 50 MB limit', () => {
    expect(createDocumentBodySchema.safeParse({ ...file, sizeBytes: 52_428_801 }).success).toBe(false)
    expect(createDocumentBodySchema.safeParse({ ...file, sizeBytes: 52_428_800 }).success).toBe(true)
  })

  it('rejects empty files and fractional sizes', () => {
    expect(createDocumentBodySchema.safeParse({ ...file, sizeBytes: 0 }).success).toBe(false)
    expect(createDocumentBodySchema.safeParse({ ...file, sizeBytes: 10.5 }).success).toBe(false)
  })

  it('rejects a nameless file and an absurdly long name', () => {
    expect(createDocumentBodySchema.safeParse({ ...file, fileName: '' }).success).toBe(false)
    expect(createDocumentBodySchema.safeParse({ ...file, fileName: 'a'.repeat(300) }).success).toBe(false)
  })
})
