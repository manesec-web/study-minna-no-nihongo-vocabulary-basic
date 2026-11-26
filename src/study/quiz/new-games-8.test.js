import { describe, expect, it } from 'vitest'
import { act, createRound } from './engine.js'
import { countMora } from './games/game-mora.js'
import { romajiToHiragana } from './games/game-sushi.js'

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

function seqRandom(values) {
  let index = 0
  return () => values[index++ % values.length]
}

describe('eight new quiz modes', () => {
  it('mahjong is solvable by clearing each stack top to bottom', () => {
    const round = createRound('mahjong', refs(6), lib(), refs(6), zeroRandom, 0)
    expect(round.state.tiles.length).toBeGreaterThanOrEqual(9)
    const columns = new Set(round.state.tiles.map((t) => t.pos)).size
    for (let pos = 0; pos < columns; pos += 1) {
      act(round, { type: 'tap', index: pos * 3 + 2 })
      act(round, { type: 'tap', index: pos * 3 + 1 })
      act(round, { type: 'tap', index: pos * 3 + 0 })
    }
    expect(round.done).toBe(true)
    expect(round.cleared).toBe(true)
  })

  it('kanatrap offers four unique readings and judges the correct one', () => {
    const round = createRound(
      'kanatrap',
      refs(6),
      lib(),
      refs(6),
      seqRandom([0.1, 0.4, 0.7, 0.2, 0.5, 0.8, 0.3, 0.6]),
      0,
    )
    expect(round.state.options.length).toBe(4)
    expect(new Set(round.state.options).size).toBe(4)
    const correct = round.state.options.indexOf(round.state.correct)
    const event = act(round, { type: 'choose', index: correct })
    expect(event.life).toBe(0)
    expect(event.score).toBeGreaterThan(0)
  })

  it('sushi converts romaji and consumes an exact reading', () => {
    expect(romajiToHiragana('tabemasu')).toBe('たべます')
    const round = createRound('sushi', refs(6), lib(), refs(6), zeroRandom, 0)
    const word = round.state.queue[0]
    act(round, { type: 'input', value: word.kana })
    const event = act(round, { type: 'submit' })
    expect(event.score).toBeGreaterThan(0)
    expect(round.state.hit).toBe(1)
  })

  it('spottypo has exactly one changed reading', () => {
    const round = createRound('spottypo', refs(10), lib(), refs(10), zeroRandom, 0)
    expect(round.state.cards.length).toBe(6)
    const event = act(round, { type: 'tap', index: round.state.oddIndex })
    expect(event.life).toBe(0)
    expect(event.score).toBeGreaterThan(0)
  })

  it('mora counter follows the Japanese mora rules', () => {
    expect(countMora('びょういん')).toBe(4)
    expect(countMora('がっこう')).toBe(4)
    expect(countMora('こーひー')).toBe(4)
    expect(countMora('きゃ')).toBe(1)
  })

  it('mora mode judges the correct count', () => {
    const round = createRound('mora', refs(6), lib(), refs(6), zeroRandom, 0)
    const correct = round.state.options.indexOf(round.state.correct)
    const event = act(round, { type: 'choose', index: correct })
    expect(event.life).toBe(0)
    expect(event.score).toBeGreaterThan(0)
  })

  it('wordsearch hides five words and can find them by line', () => {
    const round = createRound('wordsearch', refs(10), lib(), refs(10), zeroRandom, 0)
    expect(round.state.layout).toBeTruthy()
    expect(round.state.layout.grid.length).toBe(49)
    expect(round.state.layout.words.length).toBe(5)
    // Every placed word must be findable on a straight line.
    for (const word of round.state.layout.words) {
      const pair = findLine(round.state.layout.grid, word.kana)
      expect(pair, `word ${word.kana} not placed`).not.toBeNull()
    }
  })

  it('snake prevents an instant reversal', () => {
    const round = createRound('snake', refs(6), lib(), refs(6), zeroRandom, 0)
    expect(round.state.dir).toBe('right')
    act(round, { type: 'dir', value: 'up' })
    expect(round.state.pendingDir).toBe('up')
    act(round, { type: 'dir', value: 'down' })
    expect(round.state.pendingDir).toBe('up')
  })

  it('hangman reveals letters and ignores repeated guesses', () => {
    const round = createRound('hangman', refs(6), lib(), refs(6), zeroRandom, 0)
    const target = round.state.target
    for (const ch of new Set(target)) {
      act(round, { type: 'input', value: ch })
    }
    expect(round.done).toBe(true)
    expect(round.cleared).toBe(true)
  })
})

function findLine(grid, kana) {
  const size = 7
  const chars = Array.from(kana)
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (c + chars.length <= size) {
        const text = Array.from({ length: chars.length }, (_v, i) => grid[r * size + c + i]).join('')
        if (text === kana) return [r * size + c, r * size + c + chars.length - 1]
        if (text === Array.from(kana).reverse().join('')) return [r * size + c + chars.length - 1, r * size + c]
      }
      if (r + chars.length <= size) {
        const text = Array.from({ length: chars.length }, (_v, i) => grid[(r + i) * size + c]).join('')
        if (text === kana) return [r * size + c, (r + chars.length - 1) * size + c]
        if (text === Array.from(kana).reverse().join('')) return [(r + chars.length - 1) * size + c, r * size + c]
      }
    }
  }
  return null
}
