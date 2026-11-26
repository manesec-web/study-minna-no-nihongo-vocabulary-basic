import { describe, expect, it } from 'vitest'
import { createRegistry } from '../engine/registry.js'
import { createSession } from '../engine/session.js'
import { specs as studySpecs } from './study.js'

function fakeLibrary() {
  return {
    lessonCount: () => 2,
    hasEntries: (lesson) => lesson >= 1,
    entryLessons: () => [1, 2],
    getVols: (lesson) => {
      const vols = { 1: [{ japanese: 'a' }, { japanese: 'b' }], 2: [{ japanese: 'c' }] }
      return vols[lesson] ?? []
    },
  }
}

function makeRegistry(deps = {}) {
  const reg = createRegistry()
  reg.registerAll(studySpecs({ library: fakeLibrary(), ...deps }))
  return reg
}

function startSession(mode, lessons) {
  const session = createSession()
  session.screen = 'picker'
  session.mode = mode
  session.settings[mode].lessons = lessons
  return session
}

describe('study.start', () => {
  it('builds the reader list in lesson order then vols order', () => {
    const reg = makeRegistry()
    const session = startSession('words', [2, 1])
    const result = reg.dispatch(session, 'study.start', {})
    expect(result.ok).toBe(true)
    expect(session.screen).toBe('reader')
    expect(session.items).toEqual([
      { lesson: 2, index: 0 },
      { lesson: 1, index: 0 },
      { lesson: 1, index: 1 },
    ])
    expect(session.index).toBe(0)
    expect(Number.isInteger(session.runSeed)).toBe(true)
    expect(session.runSeed).toBeGreaterThanOrEqual(0)
    expect(session.runSeed).toBeLessThan(0x100000000)
  })

  it('draws a new runSeed on every 開始', () => {
    let n = 0
    const reg = makeRegistry({ random: () => { n += 1; return (n % 10) / 10 } })
    const session = startSession('words', [1])
    reg.dispatch(session, 'study.start', {})
    const first = session.runSeed
    reg.dispatch(session, 'study.start', {})
    expect(session.runSeed).not.toBe(first)
  })

  it('shuffles the card list once with the injected random', () => {
    // Deterministic: always swap the last two positions.
    const reg = makeRegistry({ random: () => 0 })
    const session = startSession('card', [1])
    reg.dispatch(session, 'study.start', {})
    expect(session.screen).toBe('card')
    expect(session.items).toEqual([
      { lesson: 1, index: 1 },
      { lesson: 1, index: 0 },
    ])
    expect(session.flipped).toBe(false)
  })

  it('returns command-disabled when no lesson is selected', () => {
    const reg = makeRegistry()
    const session = startSession('words', [])
    const result = reg.dispatch(session, 'study.start', {})
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('command-disabled')
  })

  it('returns no-items when the selected lesson holds no entries', () => {
    const reg = makeRegistry()
    const session = createSession()
    session.screen = 'picker'
    session.mode = 'words'
    session.settings.words.lessons = [5]
    const result = reg.dispatch(session, 'study.start', {})
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('no-items')
  })

  it('refuses a non-study mode', () => {
    const reg = makeRegistry()
    const session = createSession()
    session.screen = 'home'
    session.mode = null
    const result = reg.dispatch(session, 'study.start', {})
    expect(result.ok).toBe(false)
  })
})
