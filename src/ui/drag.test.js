import { describe, expect, it } from 'vitest'
import { dragDirection, dragShift } from './drag.js'

describe('dragShift', () => {
  it('clamps travel to one item width', () => {
    expect(dragShift(-200, { canPrev: true, canNext: true, width: 100 })).toBe(-100)
    expect(dragShift(200, { canPrev: true, canNext: true, width: 100 })).toBe(100)
  })

  it('refuses a walled direction at any distance', () => {
    expect(dragShift(-200, { canPrev: true, canNext: false, width: 100 })).toBe(0)
    expect(dragShift(200, { canPrev: false, canNext: true, width: 100 })).toBe(0)
  })
})

describe('dragDirection', () => {
  it('maps past-threshold travel to a move, walled directions to nothing', () => {
    expect(dragDirection(-80, { canPrev: true, canNext: true })).toBe('next')
    expect(dragDirection(80, { canPrev: true, canNext: true })).toBe('prev')
    expect(dragDirection(-80, { canPrev: true, canNext: false })).toBeNull()
    expect(dragDirection(80, { canPrev: false, canNext: true })).toBeNull()
  })
})
