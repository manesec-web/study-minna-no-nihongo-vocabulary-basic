import { describe, expect, it } from 'vitest'
import { filterTocGroups, matchWordRanges } from './toc.js'

const vols = {
  1: [
    { japanese: 'わたし', kanji: '私', chinese: '我' },
    { japanese: 'これ', kanji: null, chinese: '這個' },
  ],
  2: [{ japanese: 'がくせい', kanji: '学生', chinese: '學生' }],
}
const library = { entry: ({ lesson, index }) => vols[lesson]?.[index] ?? null }
const items = [
  { lesson: 1, index: 0 },
  { lesson: 1, index: 1 },
  { lesson: 2, index: 0 },
]

describe('filterTocGroups', () => {
  it('returns the full list grouped by lesson for an empty query', () => {
    const groups = filterTocGroups(items, library, 0, '')
    expect(groups.map((g) => g.lesson)).toEqual([1, 2])
    expect(groups[0].rows.map((r) => r.word)).toEqual(['私', 'これ'])
    expect(groups[1].rows.map((r) => r.word)).toEqual(['学生'])
  })

  it('matches a kanji substring', () => {
    const groups = filterTocGroups(items, library, 0, '学生')
    expect(groups).toHaveLength(1)
    expect(groups[0].lesson).toBe(2)
    expect(groups[0].rows[0].parts.some((p) => p.highlight)).toBe(true)
  })

  it('matches a romaji query through the reading', () => {
    const groups = filterTocGroups(items, library, 0, 'watashi')
    expect(groups).toHaveLength(1)
    expect(groups[0].lesson).toBe(1)
    expect(groups[0].rows).toHaveLength(1)
    expect(groups[0].rows[0].word).toBe('私')
    expect(groups[0].rows[0].parts.some((p) => p.highlight)).toBe(true)
  })

  it('matches a lesson number and paints nothing', () => {
    const groups = filterTocGroups(items, library, 0, '2')
    expect(groups).toHaveLength(1)
    expect(groups[0].lesson).toBe(2)
    expect(groups[0].rows[0].parts.every((p) => !p.highlight)).toBe(true)
  })

  it('leaves no heading for a lesson whose rows all fail', () => {
    const groups = filterTocGroups(items, library, 0, 'zzzz')
    expect(groups).toEqual([])
  })
})

describe('matchWordRanges', () => {
  it('maps a reading match back onto the kanji', () => {
    expect(matchWordRanges('わたし', '私', 'わたし')).toEqual([[0, 1]])
  })
})
