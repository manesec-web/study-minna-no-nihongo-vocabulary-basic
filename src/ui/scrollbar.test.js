import { describe, expect, it } from 'vitest'
import { thumbMetrics, trackHeight } from './scrollbar.js'

describe('thumbMetrics', () => {
  it('hides the thumb when the content fits', () => {
    expect(thumbMetrics({ scrollTop: 0, viewport: 800, content: 800, track: 800 })).toEqual({
      visible: false,
      length: 0,
      offset: 0,
    })
  })

  it('sizes and positions the thumb for overflowing content', () => {
    const metrics = thumbMetrics({ scrollTop: 0, viewport: 800, content: 1600, track: 800 })
    expect(metrics.visible).toBe(true)
    expect(metrics.length).toBe(400)
    expect(metrics.offset).toBe(0)
  })
})

describe('trackHeight', () => {
  it('keeps the track clear of the viewport edges', () => {
    expect(trackHeight(844, 16)).toBe(812)
  })
})
