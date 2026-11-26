import { describe, expect, it } from 'vitest'
import { createRegistry } from '../engine/registry.js'
import { createSession } from '../engine/session.js'
import { specs as lessonSpecs } from './lessons.js'
import { specs as settingsSpecs } from './settings.js'

// A two-lesson library: lesson 1 is empty, lesson 2 has entries.
function fakeLibrary() {
  return {
    lessonCount: () => 2,
    hasEntries: (lesson) => lesson === 2,
    entryLessons: () => [2],
    getVols: (lesson) => (lesson === 2 ? [{}, {}, {}] : []),
  }
}

function makeRegistry(library = fakeLibrary()) {
  const reg = createRegistry()
  reg.registerAll([...lessonSpecs({ library }), ...settingsSpecs({})])
  return reg
}

function pickerSession(mode) {
  const session = createSession()
  session.screen = 'picker'
  session.mode = mode
  session.lessons = [
    { lesson: 1, hasEntries: false, count: 0 },
    { lesson: 2, hasEntries: true, count: 3 },
  ]
  return session
}

describe('lessons.toggle', () => {
  it('selects and deselects a lesson with entries', () => {
    const reg = makeRegistry()
    const session = pickerSession('words')
    expect(reg.dispatch(session, 'lessons.toggle', { lesson: 2 }).ok).toBe(true)
    expect(session.settings.words.lessons).toEqual([2])
    reg.dispatch(session, 'lessons.toggle', { lesson: 2 })
    expect(session.settings.words.lessons).toEqual([])
  })

  it('returns lesson-empty for a lesson with no entries', () => {
    const reg = makeRegistry()
    const session = pickerSession('words')
    const result = reg.dispatch(session, 'lessons.toggle', { lesson: 1 })
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('lesson-empty')
    expect(session.settings.words.lessons).toEqual([])
  })

  it('keeps per-mode lesson numbers separate', () => {
    const reg = makeRegistry()
    const session = pickerSession('card')
    reg.dispatch(session, 'lessons.toggle', { lesson: 2 })
    expect(session.settings.card.lessons).toEqual([2])
    expect(session.settings.words.lessons).toEqual([])
  })
})

describe('lessons.selectAll', () => {
  it('selects every non-empty lesson, skipping empty ones', () => {
    const reg = makeRegistry()
    const session = pickerSession('words')
    reg.dispatch(session, 'lessons.selectAll')
    expect(session.settings.words.lessons).toEqual([2])
  })

  it('clears when every non-empty lesson is already selected', () => {
    const reg = makeRegistry()
    const session = pickerSession('words')
    session.settings.words.lessons = [2]
    reg.dispatch(session, 'lessons.selectAll')
    expect(session.settings.words.lessons).toEqual([])
  })
})

describe('settings.patch for direction', () => {
  it('stores the card direction', () => {
    const reg = makeRegistry()
    const session = pickerSession('card')
    const result = reg.dispatch(session, 'settings.patch', { patch: { card: { direction: 'zh-jp' } } })
    expect(result.ok).toBe(true)
    expect(session.settings.card.direction).toBe('zh-jp')
  })
})
