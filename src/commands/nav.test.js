import { describe, expect, it } from 'vitest'
import { createRegistry } from '../engine/registry.js'
import { createSession } from '../engine/session.js'
import { specs as navSpecs } from './nav.js'

function makeRegistry() {
  const reg = createRegistry()
  reg.registerAll(navSpecs())
  return reg
}

describe('nav.go', () => {
  it('opens the picker with a mode from home', () => {
    const reg = makeRegistry()
    const session = createSession()
    session.screen = 'home'
    const result = reg.dispatch(session, 'nav.go', { screen: 'picker', mode: 'words' })
    expect(result.ok).toBe(true)
    expect(session.screen).toBe('picker')
    expect(session.mode).toBe('words')
  })

  it('opens quiz and clears the mode', () => {
    const reg = makeRegistry()
    const session = createSession()
    session.screen = 'home'
    session.mode = 'words'
    const result = reg.dispatch(session, 'nav.go', { screen: 'quiz' })
    expect(result.ok).toBe(true)
    expect(result.result).toEqual({ screen: 'quiz', mode: null })
    expect(session.items).toEqual([])
  })

  it('rejects an unknown mode', () => {
    const reg = makeRegistry()
    const session = createSession()
    session.screen = 'home'
    const result = reg.dispatch(session, 'nav.go', { screen: 'picker', mode: 'quiz' })
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('command-disabled')
  })

  it('rejects an unreachable screen', () => {
    const reg = makeRegistry()
    const session = createSession()
    session.screen = 'home'
    expect(reg.dispatch(session, 'nav.go', { screen: 'reader' }).ok).toBe(false)
    expect(reg.dispatch(session, 'nav.go', { screen: 'loading' }).ok).toBe(false)
  })

  it('lets bootstrap land on home from loading', () => {
    const reg = makeRegistry()
    const session = createSession()
    const result = reg.dispatch(session, 'nav.go', { screen: 'home' })
    expect(result.ok).toBe(true)
    expect(session.screen).toBe('home')
  })

  it('clears the mode when returning home', () => {
    const reg = makeRegistry()
    const session = createSession()
    session.screen = 'picker'
    session.mode = 'card'
    const result = reg.dispatch(session, 'nav.go', { screen: 'home' })
    expect(result.ok).toBe(true)
    expect(session.mode).toBeNull()
  })
})
