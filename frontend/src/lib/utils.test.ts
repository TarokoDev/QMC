import { describe, expect, it } from 'vitest'

import { capitalizeWords, cn } from '@/lib/utils'

describe('capitalizeWords', () => {
  it('title-cases each space-separated word', () => {
    expect(capitalizeWords('kim hoe')).toBe('Kim Hoe')
  })

  it('leaves already-capitalized words unchanged', () => {
    expect(capitalizeWords('Kim Hoe')).toBe('Kim Hoe')
  })

  it('only uppercases the first letter — the rest of the word is preserved as-is', () => {
    expect(capitalizeWords('mcDonald')).toBe('McDonald')
  })

  it('returns an empty string unchanged', () => {
    expect(capitalizeWords('')).toBe('')
  })

  it('preserves consecutive spaces (empty tokens pass through)', () => {
    expect(capitalizeWords('kim  hoe')).toBe('Kim  Hoe')
  })
})

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('drops falsy conditional classes', () => {
    expect(cn('a', false && 'b', undefined, 'c')).toBe('a c')
  })

  it('resolves Tailwind conflicts — the later class wins', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
})
