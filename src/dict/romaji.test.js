import { describe, expect, it } from 'vitest'
import { katakanaToHiragana, normalizeProlonged, romajiToKana } from './romaji.js'

describe('romajiToKana', () => {
  it('converts syllables', () => {
    expect(romajiToKana('watashi')).toBe('わたし')
    expect(romajiToKana('dekimasu')).toBe('できます')
  })

  it('expands macrons', () => {
    expect(romajiToKana('kyō')).toBe('きょう')
    expect(romajiToKana('kyou')).toBe('きょう')
  })

  it('handles the small つ', () => {
    expect(romajiToKana('itta')).toBe('いった')
    expect(romajiToKana('gakkō')).toBe('がっこう')
  })

  it('handles trailing ん', () => {
    expect(romajiToKana('hon')).toBe('ほん')
  })
})

describe('kana normalisations', () => {
  it('converts katakana to hiragana', () => {
    expect(katakanaToHiragana('コピー')).toBe('こぴー')
  })

  it('expands the long-vowel mark', () => {
    expect(normalizeProlonged('こぴー')).toBe('こぴい')
    expect(normalizeProlonged(katakanaToHiragana('コピー'))).toBe('こぴい')
  })
})
