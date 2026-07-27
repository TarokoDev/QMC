import { describe, expect, it } from 'vitest'

import { buildStoragePath, extensionOf, sanitizeFileName } from './document-path.js'

describe('sanitizeFileName', () => {
  it('leaves an ordinary name alone', () => {
    expect(sanitizeFileName('Signed Quote R1.pdf')).toBe('Signed Quote R1.pdf')
  })

  it('keeps unicode display names intact', () => {
    expect(sanitizeFileName('客户签名.pdf')).toBe('客户签名.pdf')
  })

  it('turns path separators into spaces so no name can look like a key', () => {
    expect(sanitizeFileName('folder/sub\\file.pdf')).toBe('folder sub file.pdf')
  })

  it('strips traversal attempts down to a plain name', () => {
    expect(sanitizeFileName('../../etc/passwd')).toBe('etc passwd')
  })

  it('drops control characters', () => {
    expect(sanitizeFileName('bad\u0007name.pdf')).toBe('badname.pdf')
  })

  it('collapses whitespace runs and trims', () => {
    expect(sanitizeFileName('  spaced   out .skp  ')).toBe('spaced out .skp')
  })

  it('falls back to "file" when nothing usable is left', () => {
    expect(sanitizeFileName('   ')).toBe('file')
    expect(sanitizeFileName('\u0000\u0001')).toBe('file')
  })

  it('caps at 200 characters but keeps the extension', () => {
    const result = sanitizeFileName(`${'a'.repeat(400)}.skp`)
    expect(result.length).toBe(200)
    expect(result.endsWith('.skp')).toBe(true)
  })
})

describe('extensionOf', () => {
  it('lowercases', () => {
    expect(extensionOf('MODEL.SKP')).toBe('skp')
  })

  it('takes only the last extension', () => {
    expect(extensionOf('archive.tar.gz')).toBe('gz')
  })

  it('returns empty for names without one', () => {
    expect(extensionOf('noext')).toBe('')
    expect(extensionOf('trailing.')).toBe('')
  })

  it('returns empty rather than escaping non-alphanumeric extensions', () => {
    expect(extensionOf('weird.名前')).toBe('')
  })

  it('returns empty for absurdly long extensions', () => {
    expect(extensionOf(`file.${'a'.repeat(11)}`)).toBe('')
  })
})

describe('buildStoragePath', () => {
  const owner = '11111111-1111-1111-1111-111111111111'
  const revision = '22222222-2222-2222-2222-222222222222'
  const document = '33333333-3333-3333-3333-333333333333'

  it('puts the owner id in the first segment — this is what storage RLS checks', () => {
    const path = buildStoragePath(owner, revision, document, 'signed.pdf')
    expect(path.split('/')).toEqual([owner, revision, `${document}.pdf`])
  })

  it('never leaks the user filename into the key', () => {
    const path = buildStoragePath(owner, revision, document, 'Client Contract (final).pdf')
    expect(path).not.toContain('Client')
    expect(path).not.toContain(' ')
  })

  it('omits the extension when there is none', () => {
    expect(buildStoragePath(owner, revision, document, 'README')).toBe(
      `${owner}/${revision}/${document}`,
    )
  })
})
