import { describe, expect, it } from 'vitest'
import { bootPercent } from './boot-progress.js'

describe('bootPercent', () => {
  it('returns 0 for no boot state', () => {
    expect(bootPercent(null)).toBe(0)
  })

  it('is verified lessons over total without a download', () => {
    expect(bootPercent({ checked: 25, total: 50 })).toBe(50)
  })

  it('fills from the verified share while streaming', () => {
    const boot = {
      checked: 20,
      total: 50,
      download: { base: 40, loaded: 300, total: 600, done: false },
    }
    // 40 + (100 - 40) * (300 / 600) = 70
    expect(bootPercent(boot)).toBe(70)
  })

  it('holds at 100 once the download has arrived', () => {
    expect(
      bootPercent({ checked: 49, total: 50, download: { base: 98, loaded: 100, total: 100, done: true } }),
    ).toBe(100)
  })

  it('holds at the cache-check share without a Content-Length', () => {
    const boot = { checked: 10, total: 50, download: { base: 20, loaded: 0, total: 0, done: false } }
    expect(bootPercent(boot)).toBe(20)
  })
})
