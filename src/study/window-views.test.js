import { describe, expect, it } from 'vitest'
import { cardEntries, readerEntries } from './window-views.js'
import { CARD_WINDOW, READER_WINDOW, windowSlots } from '../ui/window.js'
import { pickEntrySentences } from './sentence-sample.js'

const vol = {
  japanese: 'わたし',
  kanji: '私',
  chinese: '我',
  speech: ['noun'],
  tags: ['people_role_address'],
}

const library = { entry: () => vol }

const items = [{ lesson: 1, index: 0 }]
const slots = windowSlots(items.length, 0, CARD_WINDOW)

describe('cardEntries', () => {
  it('jp-zh face shows the word and asks 中文是什麼？', () => {
    const entries = cardEntries(items, slots, library, { direction: 'jp-zh', showReading: true, showStartReading: true })
    const face = entries[2].face
    expect(face.word).toBe('私')
    expect(face.ruby).toBe(true)
    expect(face.prompt).toBe('中文是什麼？')
    expect(entries[2].back.chinese).toBe('我')
  })

  it('zh-jp face shows the Chinese gloss and asks 日文是什麼？', () => {
    const entries = cardEntries(items, slots, library, { direction: 'zh-jp', showReading: true, showStartReading: true })
    const face = entries[2].face
    expect(face.word).toBe('我')
    expect(face.ruby).toBe(false)
    expect(face.prompt).toBe('日文是什麼？')
  })

  it('jp-zh face ruby needs both showStartReading and showReading', () => {
    const noStart = cardEntries(items, slots, library, { direction: 'jp-zh', showReading: true, showStartReading: false })
    expect(noStart[2].face.ruby).toBe(false)
    const noReading = cardEntries(items, slots, library, { direction: 'jp-zh', showReading: false, showStartReading: true })
    expect(noReading[2].face.ruby).toBe(false)
  })
})

const readerVol = {
  japanese: 'ひきます',
  kanji: '弾きます',
  chinese: '彈（鋼琴等）',
  note: '常用「ピアノを弾きます」，意為彈鋼琴。',
  speech: ['verb1'],
  tags: ['action'],
  kanji_note: {
    summary: '日語的「弾」與繁體用字不同。',
    details: [
      { jp: '弾', zh: '彈', note: null },
      { jp: '働', zh: null, note: '為和製字（國字），中文無此字。' },
    ],
  },
  sentence: Array.from({ length: 20 }, (_, at) => ({
    japanese: `文${at}弾きます。`,
    chinese: `句${at}`,
  })),
}

const readerLibrary = { entry: () => readerVol }
const readerItems = [{ lesson: 18, index: 2 }]
const readerSlots = windowSlots(readerItems.length, 0, READER_WINDOW)

describe('readerEntries', () => {
  it('samples 5 sentences in dictionary order and keeps the kanji note intact', () => {
    const entries = readerEntries(readerItems, readerSlots, readerLibrary, { showReading: true, showExamples: true }, 11)
    const entry = entries[2].entry
    expect(entry.sentences).toHaveLength(5)
    const expected = pickEntrySentences(readerVol.sentence, readerItems[0], 11)
    expect(entry.sentences.map((sentence) => sentence.chinese)).toEqual(expected.map((sentence) => sentence.chinese))
    expect(entry.kanjiNote).toEqual(readerVol.kanji_note)
    expect(entry.note).toBe(readerVol.note)
  })

  it('is stable for the same run seed', () => {
    const a = readerEntries(readerItems, readerSlots, readerLibrary, { showExamples: true }, 11)
    const b = readerEntries(readerItems, readerSlots, readerLibrary, { showExamples: true }, 11)
    expect(a[2].entry.sentences).toEqual(b[2].entry.sentences)
  })

  it('hides sentences when 顯示例句 is off', () => {
    const entries = readerEntries(readerItems, readerSlots, readerLibrary, { showExamples: false }, 11)
    expect(entries[2].entry.sentences).toEqual([])
  })

  it('shows every sentence when the entry has fewer than 5', () => {
    const short = {
      ...readerVol,
      sentence: [
        { japanese: 'A', chinese: '一' },
        { japanese: 'B', chinese: '二' },
      ],
    }
    const entries = readerEntries(readerItems, readerSlots, { entry: () => short }, { showExamples: true }, 3)
    expect(entries[2].entry.sentences.map((sentence) => sentence.chinese)).toEqual(['一', '二'])
  })
})

describe('cardEntries 只顯示平假名', () => {
  const kanaVol = {
    japanese: 'ひきます',
    kanji: '弾きます',
    chinese: '彈（鋼琴等）',
    speech: ['verb1'],
  }
  const kanaLibrary = { entry: () => kanaVol }
  const kanaItems = [{ lesson: 18, index: 0 }]
  const kanaSlots = windowSlots(kanaItems.length, 0, CARD_WINDOW)
  const on = { direction: 'jp-zh', showReading: true, showStartReading: true, showHiraganaOnly: true }

  it('shows only the hiragana reading on the jp-zh face and ignores 一開始顯示讀音', () => {
    const entries = cardEntries(kanaItems, kanaSlots, kanaLibrary, on)
    const face = entries[2].face
    expect(face.word).toBe('ひきます')
    expect(face.ruby).toBe(false)
    expect(face.reading).toBe('')
    expect(face.prompt).toBe('中文是什麼？')
    expect(entries[2].back.word).toBe('弾きます')
    expect(entries[2].back.ruby).toBe(true)
  })

  it('transcribes katakana in the stored reading', () => {
    const loan = { japanese: 'グループ', kanji: null, chinese: '小組', speech: ['noun'] }
    const entries = cardEntries(kanaItems, kanaSlots, { entry: () => loan }, on)
    expect(entries[2].face.word).toBe('ぐるーぷ')
    expect(entries[2].face.ruby).toBe(false)
    expect(entries[2].back.word).toBe('グループ')
  })

  it('does not change the zh-jp question', () => {
    const entries = cardEntries(kanaItems, kanaSlots, kanaLibrary, { ...on, direction: 'zh-jp' })
    expect(entries[2].face.word).toBe('彈（鋼琴等）')
    expect(entries[2].face.prompt).toBe('日文是什麼？')
  })
})
