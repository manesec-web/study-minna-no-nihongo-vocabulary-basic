import { describe, expect, it } from 'vitest'
import { createRegistry } from '../engine/registry.js'
import { createSession } from '../engine/session.js'
import { specs as glyphSpecs } from './glyph.js'

const LESSON_1 = {
  japanese: 'わたし',
  kanji: '私',
  kanji_note: {
    summary: '繁簡對照',
    details: [
      { jp: '会', zh: '會', note: null },
      { jp: '歳', zh: '歲', note: '「嵗」為異體，勿混用' },
      { jp: '働', zh: null, note: null },
    ],
  },
}

function fakeLibrary() {
  return {
    entry: ({ lesson, index }) => {
      if (lesson === 1 && index === 0) return LESSON_1
      return null
    },
  }
}

function makeRegistry() {
  const reg = createRegistry()
  reg.registerAll(glyphSpecs({ library: fakeLibrary() }))
  return reg
}

function readerSession() {
  const session = createSession()
  session.screen = 'reader'
  session.items = [{ lesson: 1, index: 0 }]
  session.index = 0
  return session
}

describe('glyph.open', () => {
  it('records the clicked pair and opens the glyph screen', () => {
    const reg = makeRegistry()
    const session = readerSession()
    const result = reg.dispatch(session, 'glyph.open', { detailIndex: 0 })
    expect(result.ok).toBe(true)
    expect(session.screen).toBe('glyph')
    expect(session.glyph).toMatchObject({
      lesson: 1,
      index: 0,
      detailIndex: 0,
      zh: '會',
      jp: '会',
      note: null,
      simplified: '会',
      hasTraditional: true,
    })
    expect(session.glyphPlayCount).toBe(0)
  })

  it('keeps the pair note and does not invent Simplified for a kokuji', () => {
    const reg = makeRegistry()
    const session = readerSession()
    reg.dispatch(session, 'glyph.open', { detailIndex: 1 })
    expect(session.glyph.note).toBe('「嵗」為異體，勿混用')
    expect(session.glyph.zh).toBe('歲')
    expect(session.glyph.simplified).toBe('岁')

    session.screen = 'reader'
    reg.dispatch(session, 'glyph.open', { detailIndex: 2 })
    expect(session.glyph.zh).toBeNull()
    expect(session.glyph.simplified).toBe('')
    expect(session.glyph.hasTraditional).toBe(false)
    expect(session.glyph.jp).toBe('働')
  })

  it('rejects a detail index that does not exist', () => {
    const reg = makeRegistry()
    const session = readerSession()
    const result = reg.dispatch(session, 'glyph.open', { detailIndex: 9 })
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('invalid-index')
    expect(session.screen).toBe('reader')
  })

  it('is disabled outside the reader', () => {
    const reg = makeRegistry()
    const session = createSession()
    session.screen = 'home'
    const result = reg.dispatch(session, 'glyph.open', { detailIndex: 0 })
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('command-disabled')
  })
})

describe('glyph.play', () => {
  it('bumps the play counter on the glyph screen', () => {
    const reg = makeRegistry()
    const session = readerSession()
    reg.dispatch(session, 'glyph.open', { detailIndex: 0 })
    expect(reg.dispatch(session, 'glyph.play', {}).result).toEqual({ playCount: 1 })
    expect(reg.dispatch(session, 'glyph.play', {}).result).toEqual({ playCount: 2 })
  })

  it('is disabled before a pair is open', () => {
    const reg = makeRegistry()
    const session = readerSession()
    const result = reg.dispatch(session, 'glyph.play', {})
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('command-disabled')
  })
})
