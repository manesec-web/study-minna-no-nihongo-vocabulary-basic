import { describe, expect, it } from 'vitest'
import {
  SENTENCE_SAMPLE_SIZE,
  entryRandom,
  pickEntrySentences,
  pickSentences,
  sampleIndices,
} from './sentence-sample.js'

describe('sampleIndices', () => {
  it('returns 5 unique sorted indices from 20', () => {
    const picked = sampleIndices(20, SENTENCE_SAMPLE_SIZE, () => 0.5)
    expect(picked).toHaveLength(5)
    expect(new Set(picked).size).toBe(5)
    expect(picked).toEqual([...picked].sort((a, b) => a - b))
    expect(picked.every((at) => at >= 0 && at < 20)).toBe(true)
  })

  it('returns every index when the list is shorter than 5', () => {
    expect(sampleIndices(3, 5, () => 0.9)).toEqual([0, 1, 2])
  })

  it('returns an empty list when there are no sentences', () => {
    expect(sampleIndices(0, 5, () => 0.1)).toEqual([])
  })
})

describe('pickSentences', () => {
  const twenty = Array.from({ length: 20 }, (_, at) => ({ id: at }))

  it('returns the original sentence objects, not invented ones', () => {
    const picked = pickSentences(twenty, 5, () => 0.25)
    expect(picked).toHaveLength(5)
    for (const sentence of picked) {
      expect(twenty).toContain(sentence)
    }
    // Dictionary order is preserved.
    const ids = picked.map((sentence) => sentence.id)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
  })

  it('treats a missing list as empty', () => {
    expect(pickSentences(null, 5, () => 0)).toEqual([])
  })
})

describe('pickEntrySentences', () => {
  const twenty = Array.from({ length: 20 }, (_, at) => `s${at}`)

  it('is stable for the same run seed and entry', () => {
    const item = { lesson: 18, index: 3 }
    const first = pickEntrySentences(twenty, item, 42)
    const second = pickEntrySentences(twenty, item, 42)
    expect(first).toEqual(second)
    expect(first).toHaveLength(5)
  })

  it('changes when the run seed changes', () => {
    const item = { lesson: 18, index: 3 }
    const first = pickEntrySentences(twenty, item, 1)
    const second = pickEntrySentences(twenty, item, 2)
    expect(first).not.toEqual(second)
  })

  it('can differ across entries in the same run', () => {
    const a = pickEntrySentences(twenty, { lesson: 1, index: 0 }, 7)
    const b = pickEntrySentences(twenty, { lesson: 1, index: 1 }, 7)
    expect(a).not.toEqual(b)
  })

  it('entryRandom is in [0, 1)', () => {
    const random = entryRandom(99, 4, 2)
    for (let i = 0; i < 8; i += 1) {
      const value = random()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})
