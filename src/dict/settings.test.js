import { describe, expect, it } from 'vitest'
import {
  applyPatch,
  defaultSettings,
  normalizeSettings,
  validatePatch,
} from './settings.js'

describe('settings schema', () => {
  it('returns the documented defaults', () => {
    expect(defaultSettings()).toEqual({
      words: { lessons: [], showReading: true, showExamples: true },
      card: { lessons: [], direction: 'jp-zh', showReading: true, showStartReading: true, showHiraganaOnly: false },
    })
  })

  it('drops unknown fields and falls back to defaults for missing fields', () => {
    const normalized = normalizeSettings({
      words: { lessons: [3, 1], bogus: true },
      card: { direction: 'zh-jp' },
      analytics: 'GTM-XXX',
    })
    expect(normalized.words).toEqual({ lessons: [1, 3], showReading: true, showExamples: true })
    expect(normalized.card).toEqual({
      lessons: [],
      direction: 'zh-jp',
      showReading: true,
      showStartReading: true,
      showHiraganaOnly: false,
    })
  })

  it('resets the whole object when given non-object input', () => {
    expect(normalizeSettings(null)).toEqual(defaultSettings())
    expect(normalizeSettings([1, 2])).toEqual(defaultSettings())
  })

  it('validates a patch and rejects unknown or invalid fields', () => {
    expect(validatePatch({ card: { direction: 'zh-jp' } }).ok).toBe(true)
    expect(validatePatch({ card: { direction: 'sideways' } }).ok).toBe(false)
    expect(validatePatch({ card: { nope: true } }).ok).toBe(false)
    expect(validatePatch({ quiz: {} }).ok).toBe(false)
  })

  it('applies a patch without mutating the original', () => {
    const settings = defaultSettings()
    const next = applyPatch(settings, { card: { lessons: [5, 2], direction: 'zh-jp' } })
    expect(settings.card.lessons).toEqual([])
    expect(next.card).toEqual({
      lessons: [2, 5],
      direction: 'zh-jp',
      showReading: true,
      showStartReading: true,
      showHiraganaOnly: false,
    })
  })
})

  it('accepts showHiraganaOnly on card and defaults it to off', () => {
    expect(validatePatch({ card: { showHiraganaOnly: true } }).ok).toBe(true)
    expect(validatePatch({ words: { showHiraganaOnly: true } }).ok).toBe(false)
    const next = applyPatch(defaultSettings(), { card: { showHiraganaOnly: true } })
    expect(next.card.showHiraganaOnly).toBe(true)
    expect(next.card.showStartReading).toBe(true)
  })
