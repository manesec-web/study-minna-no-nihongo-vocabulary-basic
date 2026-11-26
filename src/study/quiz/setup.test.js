import { describe, expect, it } from 'vitest'
import {
  applyQuizPatch,
  defaultQuizSetup,
  normalizeQuizSetup,
  requestedWordCount,
  validateQuizPatch,
} from './setup.js'

describe('quiz setup', () => {
  it('returns defaults for empty input', () => {
    expect(normalizeQuizSetup(null)).toEqual(defaultQuizSetup())
    expect(normalizeQuizSetup(undefined)).toEqual(defaultQuizSetup())
    expect(normalizeQuizSetup({ lessons: [3, 1] }).lessons).toEqual([1, 3])
  })

  it('drops unknown keys and invalid values', () => {
    const setup = normalizeQuizSetup({ count: 99, bogus: true, modes: ['nope'] })
    expect(setup.count).toBe('all')
    expect(setup.modes).toEqual([])
  })

  it('drops retired kana/tower modes but keeps still-valid selections', () => {
    const setup = normalizeQuizSetup({ modes: ['choice', 'kana', 'tower', 'pairs'] })
    expect(setup.modes).toEqual(['choice', 'pairs'])
  })

  it('validates and applies a patch', () => {
    expect(validateQuizPatch({ count: 50 }).ok).toBe(true)
    expect(validateQuizPatch({ count: 99 }).ok).toBe(false)
    expect(validateQuizPatch({ bogus: true }).ok).toBe(false)
    const next = applyQuizPatch(defaultQuizSetup(), { lives: 3, random: true })
    expect(next.lives).toBe(3)
    expect(next.random).toBe(true)
  })

  it('computes the requested word count', () => {
    expect(requestedWordCount({ count: 'all' }, 37)).toBe(37)
    expect(requestedWordCount({ count: 100 }, 37)).toBe(37)
    expect(requestedWordCount({ count: 30 }, 37)).toBe(30)
  })

  it('treats a loaded random setup as random-only, dropping leftover modes', () => {
    const setup = normalizeQuizSetup({ random: true, modes: ['choice', 'pairs'] })
    expect(setup.random).toBe(true)
    expect(setup.modes).toEqual([])
  })

  it('clears concrete modes when a patch turns 隨機模式 on', () => {
    const current = applyQuizPatch(defaultQuizSetup(), { modes: ['choice'] })
    expect(current.modes).toEqual(['choice'])
    const on = applyQuizPatch(current, { random: true })
    expect(on.random).toBe(true)
    expect(on.modes).toEqual([])
    const off = applyQuizPatch(on, { random: false })
    expect(off.random).toBe(false)
    expect(off.modes).toEqual([])
  })
})
