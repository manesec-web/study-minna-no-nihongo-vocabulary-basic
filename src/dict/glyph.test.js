import { describe, expect, it } from 'vitest'
import { glyphRow, simplifiedOf } from './glyph.js'

describe('glyphRow', () => {
  it('maps a Traditional / Japanese pair to the three table cells', () => {
    expect(glyphRow({ jp: '会', zh: '會', note: null })).toEqual({
      simplified: '会',
      traditional: '會',
      japanese: '会',
      hasTraditional: true,
    })
  })

  it('leaves Simplified and Traditional empty for a kokuji (zh null)', () => {
    expect(glyphRow({ jp: '働', zh: null, note: null })).toEqual({
      simplified: '',
      traditional: '',
      japanese: '働',
      hasTraditional: false,
    })
  })

  it('keeps a same-code pair in the table', () => {
    expect(glyphRow({ jp: '漢', zh: '漢' })).toEqual({
      simplified: '汉',
      traditional: '漢',
      japanese: '漢',
      hasTraditional: true,
    })
  })
})

describe('simplifiedOf', () => {
  it('converts Taiwan Traditional to Mainland Simplified via opencc-js', () => {
    expect(simplifiedOf('會')).toBe('会')
    expect(simplifiedOf('國')).toBe('国')
    expect(simplifiedOf('歲')).toBe('岁')
  })

  it('never rewrites 台 to 臺', () => {
    expect(simplifiedOf('台')).toBe('台')
  })

  it('returns empty for a missing string', () => {
    expect(simplifiedOf('')).toBe('')
    expect(simplifiedOf(null)).toBe('')
  })
})
