import { describe, expect, it } from 'vitest'
import { CURRENT_SLOT, READER_WINDOW, shiftWindow, windowSlots } from './window.js'

describe('windowSlots', () => {
  it('keeps the current item in the 3rd slot', () => {
    const slots = windowSlots(10, 4, READER_WINDOW)
    expect(slots).toEqual([2, 3, 4, 5, 6])
    expect(slots[CURRENT_SLOT]).toBe(4)
  })

  it('clamps to the ends of the list', () => {
    expect(windowSlots(10, 0, READER_WINDOW)).toEqual([null, null, 0, 1, 2])
    expect(windowSlots(10, 9, READER_WINDOW)).toEqual([7, 8, 9, null, null])
  })

  it('returns all-empty slots for an empty list', () => {
    expect(windowSlots(0, 0, READER_WINDOW)).toEqual([null, null, null, null, null])
  })
})

describe('shiftWindow', () => {
  it('appends the next item and deletes the front on next', () => {
    expect(shiftWindow([0, 1, 2, 3, 4], 10, 'next')).toEqual([1, 2, 3, 4, 5])
  })

  it('prepends the previous item and deletes the back on prev', () => {
    expect(shiftWindow([2, 3, 4, 5, 6], 10, 'prev')).toEqual([1, 2, 3, 4, 5])
  })

  it('refuses to move past an end', () => {
    expect(shiftWindow([7, 8, 9, null, null], 10, 'next')).toBeNull()
    expect(shiftWindow([null, null, 0, 1, 2], 10, 'prev')).toBeNull()
  })
})
