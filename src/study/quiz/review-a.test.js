import { describe, expect, it, vi } from 'vitest'
import { act, createRound } from './engine.js'
import { arrowCell, lineCells, SIZE } from './games/game-wordsearch.js'
import { hasAdjacentParallel } from './games/game-crossword.js'
import { romajiToHiragana } from './games/game-sushi.js'
import { createVisibilityInterval } from './visibility-interval.js'

const WORDS = [
  { japanese: 'たべます', kanji: '食べます', chinese: '吃' },
  { japanese: 'のみます', kanji: '飲みます', chinese: '喝' },
  { japanese: 'かいます', kanji: '買います', chinese: '買' },
  { japanese: 'いきます', kanji: '行きます', chinese: '去' },
  { japanese: 'かお', kanji: '顔', chinese: '臉' },
  { japanese: 'おかね', kanji: 'お金', chinese: '錢' },
  { japanese: 'かみ', kanji: '髪', chinese: '頭髮' },
  { japanese: 'ねこ', kanji: '猫', chinese: '貓' },
  { japanese: 'いぬ', kanji: '犬', chinese: '狗' },
  { japanese: 'みみ', kanji: '耳', chinese: '耳朵' },
]

function lib(count = WORDS.length) {
  const vols = WORDS.slice(0, count)
  return {
    getVols: (lesson) => (lesson === 1 ? vols : []),
    entry: ({ lesson, index }) => (lesson === 1 ? vols[index] ?? null : null),
  }
}

function refs(n) {
  return Array.from({ length: n }, (_v, index) => ({ lesson: 1, index }))
}

const zeroRandom = () => 0

describe('review A mechanisms', () => {
  it('wordsearch lineCells is straight-only and arrowCell clamps', () => {
    expect(lineCells(0, 3)).toEqual([0, 1, 2, 3])
    expect(lineCells(0, 21)).toEqual([0, 7, 14, 21])
    expect(lineCells(0, 8)).toBeNull() // diagonal
    expect(arrowCell(0, 'ArrowRight')).toBe(1)
    expect(arrowCell(0, 'ArrowDown')).toBe(7)
    expect(arrowCell(0, 'ArrowLeft')).toBe(0) // clamped
  })

  it('wordsearch found set is idempotent', () => {
    const round = createRound('wordsearch', refs(10), lib(), refs(10), zeroRandom, 0)
    const layout = round.state.layout
    // Find one word and tap it twice.
    for (const word of layout.words) {
      const pair = findLine(layout.grid, word.kana)
      if (!pair) continue
      act(round, { type: 'tap', index: pair[0] })
      act(round, { type: 'tap', index: pair[1] })
      const after = round.state.found.length
      act(round, { type: 'tap', index: pair[0] })
      act(round, { type: 'tap', index: pair[1] })
      expect(round.state.found.length).toBe(after)
      break
    }
  })

  it('snake queues directions to block a reversal', () => {
    const round = createRound('snake', refs(6), lib(), refs(6), zeroRandom, 0)
    expect(round.state.dir).toBe('right')
    act(round, { type: 'dir', value: 'up' })
    expect(round.state.pendingDir).toBe('up')
    act(round, { type: 'dir', value: 'down' }) // opposite of queued up → ignored
    expect(round.state.pendingDir).toBe('up')
  })

  it('mahjong blocks covered tiles and prefers a triple over the 7-slot limit', () => {
    const round = createRound('mahjong', refs(6), lib(), refs(6), zeroRandom, 0)
    // Layer 0 is covered: tapping it must not enter the tray.
    act(round, { type: 'tap', index: 0 })
    expect(round.state.tray.length).toBe(0)
    // Fill the tray toward 7 but finish a triple on the 7th tap.
    act(round, { type: 'tap', index: 2 }) // pos0 layer2
    act(round, { type: 'tap', index: 1 }) // pos0 layer1
    for (const pos of [1, 2, 3, 4]) act(round, { type: 'tap', index: pos * 3 + 2 })
    expect(round.state.tray.length).toBe(6)
    act(round, { type: 'tap', index: 0 }) // pos0 layer0 → triple clears
    expect(round.state.tray.length).toBeLessThan(7)
    expect(round.state.tiles[0].cleared).toBe(true)
  })

  it('sushi romaji handles dakuten, small kana, っ, ん and long vowel', () => {
    expect(romajiToHiragana('gakkou')).toBe('がっこう')
    expect(romajiToHiragana('kitte')).toBe('きって')
    expect(romajiToHiragana('kya')).toBe('きゃ')
    expect(romajiToHiragana('konnichi')).toBe('こんにち')
    expect(romajiToHiragana('kohi-')).toBe('こひー')
  })

  it('crossword generator rejects adjacent parallel words', () => {
    const round = createRound('crossword', refs(8), lib(), refs(8), zeroRandom, 0)
    expect(round.state.layout).toBeTruthy()
    expect(round.done).toBe(false)
    expect(hasAdjacentParallel(round.state.layout)).toBe(false)
    // A hand-built adjacent-parallel layout must be detected.
    const bad = {
      placements: [
        { word: 0, row: 0, col: 0, dir: 0, length: 2 },
        { word: 1, row: 1, col: 0, dir: 0, length: 2 },
      ],
    }
    expect(hasAdjacentParallel(bad)).toBe(true)
  })

  it('visibility interval pauses when hidden and resumes', () => {
    vi.useFakeTimers()
    const calls = []
    const doc = { hidden: false, listeners: {}, addEventListener(t, fn) { this.listeners[t] = fn }, removeEventListener(t) { delete this.listeners[t] } }
    const win = { listeners: {}, addEventListener(t, fn) { this.listeners[t] = fn }, removeEventListener(t) { delete this.listeners[t] } }
    const handle = createVisibilityInterval({ callback: () => calls.push(1), interval: 1000, documentObj: doc, windowObj: win })
    vi.advanceTimersByTime(1000)
    expect(calls.length).toBe(1)
    doc.hidden = true
    doc.listeners.visibilitychange()
    vi.advanceTimersByTime(3000)
    expect(calls.length).toBe(1)
    doc.hidden = false
    doc.listeners.visibilitychange()
    vi.advanceTimersByTime(1000)
    expect(calls.length).toBe(2)
    handle.stop()
    vi.useRealTimers()
  })
})

function findLine(grid, kana) {
  const size = SIZE
  const chars = Array.from(kana)
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (c + chars.length <= size) {
        const text = Array.from({ length: chars.length }, (_v, i) => grid[r * size + c + i]).join('')
        if (text === kana) return [r * size + c, r * size + c + chars.length - 1]
      }
      if (r + chars.length <= size) {
        const text = Array.from({ length: chars.length }, (_v, i) => grid[(r + i) * size + c]).join('')
        if (text === kana) return [r * size + c, (r + chars.length - 1) * size + c]
      }
    }
  }
  return null
}
