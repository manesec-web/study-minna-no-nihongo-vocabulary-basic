import { describe, expect, it } from 'vitest'
import { GESTURE_MAX_WIDTH, resolveSwipe, swipeEnabled } from './swipe.js'

describe('resolveSwipe', () => {
  it('names a left swipe past the threshold', () => {
    expect(resolveSwipe(-72)).toBe('left')
    expect(resolveSwipe(-120)).toBe('left')
  })

  it('names a right swipe past the threshold', () => {
    expect(resolveSwipe(72)).toBe('right')
  })

  it('names nothing below the threshold', () => {
    expect(resolveSwipe(-71)).toBeNull()
    expect(resolveSwipe(71)).toBeNull()
  })
})

describe('swipeEnabled', () => {
  it('is enabled on the phone layout only', () => {
    expect(swipeEnabled(390)).toBe(true)
    expect(swipeEnabled(GESTURE_MAX_WIDTH)).toBe(true)
    expect(swipeEnabled(GESTURE_MAX_WIDTH + 1)).toBe(false)
  })
})
