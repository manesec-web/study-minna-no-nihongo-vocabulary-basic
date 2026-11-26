import { describe, expect, it } from 'vitest'
import { alignReading, hiraganaOnlyText, toHiragana } from './ruby.js'

function joined(tokens) {
  return tokens.map((token) => token.text).join('')
}

function rubyOf(tokens, text) {
  return tokens.find((token) => token.text === text)?.ruby ?? null
}

describe('alignReading', () => {
  it('aligns 私 / わたし', () => {
    const result = alignReading('私', 'わたし')
    expect(result.ok).toBe(true)
    expect(rubyOf(result.tokens, '私')).toBe('わたし')
  })

  it('aligns 違います / ちがいます', () => {
    const result = alignReading('違います', 'ちがいます')
    expect(result.ok).toBe(true)
    expect(rubyOf(result.tokens, '違')).toBe('ちが')
    expect(rubyOf(result.tokens, 'います')).toBeNull()
    expect(joined(result.tokens)).toBe('違います')
  })

  it('renders これ (kanji: null display) with no ruby', () => {
    const result = alignReading('これ', 'これ')
    expect(result.ok).toBe(true)
    expect(result.tokens.every((token) => token.ruby === null)).toBe(true)
    expect(joined(result.tokens)).toBe('これ')
  })

  // Pure alignment cases (not required to exist in the product files).
  it('aligns 置く / おく', () => {
    const result = alignReading('置く', 'おく')
    expect(result.ok).toBe(true)
    expect(rubyOf(result.tokens, '置')).toBe('お')
    expect(rubyOf(result.tokens, 'く')).toBeNull()
  })

  it('aligns 勉強する / べんきょうする', () => {
    const result = alignReading('勉強する', 'べんきょうする')
    expect(result.ok).toBe(true)
    expect(rubyOf(result.tokens, '勉強')).toBe('べんきょう')
    expect(rubyOf(result.tokens, 'する')).toBeNull()
  })

  it('keeps コピーする / コピーする as katakana without ruby', () => {
    const result = alignReading('コピーする', 'コピーする')
    expect(result.ok).toBe(true)
    expect(result.tokens.every((token) => token.ruby === null)).toBe(true)
    expect(joined(result.tokens)).toBe('コピーする')
  })

  it('falls back to the full reading above the whole word on mismatch', () => {
    const result = alignReading('食べる', 'た')
    expect(result.ok).toBe(false)
    expect(result.tokens).toEqual([{ text: '食べる', ruby: 'た' }])
  })
})

describe('toHiragana', () => {
  it('leaves hiragana unchanged', () => {
    expect(toHiragana('わたし')).toBe('わたし')
  })

  it('transcribes katakana letters, keeping the long-vowel mark', () => {
    expect(toHiragana('フランス')).toBe('ふらんす')
    expect(toHiragana('グループ')).toBe('ぐるーぷ')
    expect(toHiragana('けしゴム')).toBe('けしごむ')
    expect(toHiragana('ローマじ')).toBe('ろーまじ')
  })

  it('does not invent a reading for leftover kanji or Latin', () => {
    expect(toHiragana('これで終わります')).toBe('これで終わります')
    expect(toHiragana('CD')).toBe('CD')
  })

  it('returns an empty string when there is no text', () => {
    expect(toHiragana('')).toBe('')
    expect(toHiragana(null)).toBe('')
  })
})

describe('hiraganaOnlyText', () => {
  it('prefers the stored reading', () => {
    expect(hiraganaOnlyText('ひきます', '弾きます')).toBe('ひきます')
  })

  it('falls back to transcribing the display word when japanese is empty', () => {
    expect(hiraganaOnlyText('', 'フランス')).toBe('ふらんす')
    expect(hiraganaOnlyText(null, 'わたし')).toBe('わたし')
  })

  it('does not fabricate a reading when both are empty', () => {
    expect(hiraganaOnlyText('', '')).toBe('')
    expect(hiraganaOnlyText(null, null)).toBe('')
  })
})
