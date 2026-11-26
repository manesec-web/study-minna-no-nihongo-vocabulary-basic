import { describe, expect, it } from 'vitest'
import { highlightSegments, sentenceParts } from './highlight.js'

describe('sentence highlighting', () => {
  it('marks every exact occurrence of the display word', () => {
    const parts = sentenceParts({ japanese: '私は学生です。' }, '私')
    expect(parts).toEqual([
      { text: '私', highlight: true },
      { text: 'は学生です。', highlight: false },
    ])
  })

  it('leaves the sentence untouched when the word is absent', () => {
    expect(highlightSegments('私は学生です。', 'あなた')).toEqual([
      { text: '私は学生です。', highlight: false },
    ])
  })
})
