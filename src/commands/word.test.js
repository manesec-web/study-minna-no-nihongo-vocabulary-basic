import { describe, expect, it } from 'vitest'
import { createRegistry } from '../engine/registry.js'
import { createSession } from '../engine/session.js'
import { specs as wordSpecs } from './word.js'

function makeRegistry() {
  const reg = createRegistry()
  reg.registerAll(wordSpecs())
  return reg
}

function readerSession() {
  const session = createSession()
  session.screen = 'reader'
  session.items = [{ lesson: 1, index: 0 }, { lesson: 1, index: 1 }, { lesson: 2, index: 0 }]
  session.index = 0
  return session
}

describe('word.next / word.prev', () => {
  it('advances and clamps at the end', () => {
    const reg = makeRegistry()
    const session = readerSession()
    reg.dispatch(session, 'word.next', {})
    expect(session.index).toBe(1)
    reg.dispatch(session, 'word.next', {})
    reg.dispatch(session, 'word.next', {})
    expect(session.index).toBe(2)
  })

  it('moves backward and clamps at the start', () => {
    const reg = makeRegistry()
    const session = readerSession()
    session.index = 2
    reg.dispatch(session, 'word.prev', {})
    expect(session.index).toBe(1)
    reg.dispatch(session, 'word.prev', {})
    reg.dispatch(session, 'word.prev', {})
    expect(session.index).toBe(0)
  })
})

describe('word.goto', () => {
  it('jumps to a valid index and returns to the reader', () => {
    const reg = makeRegistry()
    const session = readerSession()
    session.screen = 'toc'
    const result = reg.dispatch(session, 'word.goto', { index: 2 })
    expect(result.ok).toBe(true)
    expect(session.index).toBe(2)
    expect(session.screen).toBe('reader')
  })

  it('rejects an index outside the run', () => {
    const reg = makeRegistry()
    const session = readerSession()
    session.screen = 'toc'
    const result = reg.dispatch(session, 'word.goto', { index: 9 })
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('invalid-index')
  })
})
