import { describe, expect, it } from 'vitest'
import { createRespawnTimers, RESPAWN_DELAY_MS } from './respawn-timer.js'

describe('snake respawn timer', () => {
  it('waits 1s, then dispatches quiz.act respawn once per flagged tick', () => {
    const sent = []
    const timers = new Map()
    let next = 1
    const setTimer = (fn, delay) => {
      const id = next++
      timers.set(id, { fn, delay })
      return id
    }
    const clearTimer = (id) => timers.delete(id)
    const respawn = createRespawnTimers({ send: (id, params) => sent.push([id, params]), setTimer, clearTimer })

    respawn.schedule()
    respawn.schedule()
    expect(timers.size).toBe(2)
    expect([...timers.values()].every((t) => t.delay === RESPAWN_DELAY_MS)).toBe(true)
    expect(RESPAWN_DELAY_MS).toBe(1000)
    expect(sent).toEqual([])
    for (const t of [...timers.values()]) t.fn()
    expect(sent).toEqual([
      ['quiz.act', { type: 'respawn' }],
      ['quiz.act', { type: 'respawn' }],
    ])
    expect(respawn.pending()).toBe(0)
  })

  it('cancel drops a pending re-placement when the board unmounts', () => {
    const sent = []
    const timers = new Map()
    let next = 1
    const respawn = createRespawnTimers({
      send: (id, params) => sent.push([id, params]),
      setTimer: (fn, delay) => {
        const id = next++
        timers.set(id, { fn, delay })
        return id
      },
      clearTimer: (id) => timers.delete(id),
    })
    respawn.schedule()
    expect(respawn.pending()).toBe(1)
    respawn.cancel()
    expect(respawn.pending()).toBe(0)
    for (const t of [...timers.values()]) t.fn()
    expect(sent).toEqual([])
  })
})
