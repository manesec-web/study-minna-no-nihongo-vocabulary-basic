import { describe, expect, it } from 'vitest'
import { createRegistry } from '../engine/registry.js'
import { createSession } from '../engine/session.js'
import { specs as cardSpecs } from './card.js'

function makeRegistry() {
  const reg = createRegistry()
  reg.registerAll(cardSpecs())
  return reg
}

function cardSession() {
  const session = createSession()
  session.screen = 'card'
  session.items = [{ lesson: 1, index: 0 }, { lesson: 1, index: 1 }]
  session.index = 0
  session.flipped = false
  return session
}

describe('card commands', () => {
  it('flips the card', () => {
    const reg = makeRegistry()
    const session = cardSession()
    reg.dispatch(session, 'card.flip', {})
    expect(session.flipped).toBe(true)
  })

  it('card.next advances and opens the new card face-up', () => {
    const reg = makeRegistry()
    const session = cardSession()
    reg.dispatch(session, 'card.flip', {})
    const result = reg.dispatch(session, 'card.next', {})
    expect(result.ok).toBe(true)
    expect(session.index).toBe(1)
    expect(session.flipped).toBe(false)
  })

  it('card.prev clamps at the first card and turns it face-up', () => {
    const reg = makeRegistry()
    const session = cardSession()
    session.flipped = true
    reg.dispatch(session, 'card.prev', {})
    expect(session.index).toBe(0)
    expect(session.flipped).toBe(false)
  })
})
