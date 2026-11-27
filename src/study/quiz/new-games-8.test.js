import { describe, expect, it } from 'vitest'
import { act, createRound } from './engine.js'
import { romajiToHiragana } from './games/game-sushi.js'
import { solutionOrder, tileRect } from './games/game-mahjong.js'

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

// A tiny deterministic LCG so generated boards are repeatable but varied.
function seeded(seed) {
  let value = seed
  return () => {
    value = (value * 9301 + 0.49297) % 1
    return value
  }
}

function seqRandom(values) {
  let index = 0
  return () => values[index++ % values.length]
}

describe('eight new quiz modes', () => {
  it('mahjong is solvable: the sweep order clears every board without losing a life', () => {
    for (const n of [3, 5, 10]) {
      for (const seed of [0.05, 0.4, 0.85]) {
        const round = createRound('mahjong', refs(n), lib(n), refs(n), seeded(seed), 0)
        const order = solutionOrder(round.state)
        expect(order.length).toBe(round.state.tiles.length)
        let peak = 0
        for (const index of order) {
          const event = act(round, { type: 'tap', index })
          expect(event.life, `${n} words, seed ${seed}, tile ${index}: ${event.message}`).toBe(0)
          expect(round.state.tray.length).toBeLessThanOrEqual(7)
          peak = Math.max(peak, round.state.tray.length)
        }
        expect(round.done, `${n} words, seed ${seed}`).toBe(true)
        expect(round.cleared).toBe(true)
        expect(round.state.tray.length).toBe(0)
        expect(peak).toBeLessThanOrEqual(6)
      }
    }
  })

  it('mahjong deals a dense multi-layer pile with three faces per triple', () => {
    const round = createRound('mahjong', refs(10), lib(10), refs(10), seeded(0.2), 0)
    const state = round.state
    expect(state.tiles.length).toBe(54)
    expect(state.layers).toBe(4)
    expect(new Set(state.tiles.map((t) => t.layer)).size).toBe(4)
    expect(new Set(state.tiles.map((t) => t.col)).size).toBeGreaterThanOrEqual(6)
    expect(new Set(state.tiles.map((t) => t.row)).size).toBeGreaterThanOrEqual(4)
    // Every canonical word has its 漢字/假名/中文 faces in equal numbers.
    const faces = new Map()
    for (const tile of state.tiles) {
      const list = faces.get(tile.word) ?? []
      list.push(tile.face)
      faces.set(tile.word, list)
    }
    for (const [word, list] of faces.entries()) {
      const count = (face) => list.filter((f) => f === face).length
      expect(count('jp'), `${word} jp`).toBeGreaterThan(0)
      expect(count('jp')).toBe(count('kana'))
      expect(count('jp')).toBe(count('zh'))
    }
    // The footprint is several tiles wide and deep, not a single row.
    expect(state.board.width / state.board.tileW).toBeGreaterThan(6)
    expect(state.board.height / state.board.tileH).toBeGreaterThan(4)
  })

  it('mahjong blocks covered and sandwiched tiles and frees them as neighbours go', () => {
    const round = createRound('mahjong', refs(10), lib(10), refs(10), seeded(0.2), 0)
    const state = round.state
    const at = (layer, col, row) => state.tiles.find((t) => t.layer === layer && t.col === col && t.row === row)
    // The pile tops are free; the base under a pile is covered.
    expect(at(3, 0, 0).free).toBe(true)
    expect(at(0, 0, 0).free).toBe(false)
    // A top-layer tile with both same-layer neighbours is sandwiched even
    // though nothing sits on it; the row's left end is free.
    expect(at(2, 2, 1).free).toBe(false)
    expect(at(2, 1, 1).free).toBe(true)
    const event = act(round, { type: 'tap', index: state.tiles.indexOf(at(2, 1, 1)) })
    expect(event.life).toBe(0)
    expect(round.state.tray.length).toBe(1)
    expect(at(2, 2, 1).free).toBe(true)
    // A blocked tile ignores a tap.
    const blocked = at(0, 2, 2)
    expect(blocked.free).toBe(false)
    const ignored = act(round, { type: 'tap', index: state.tiles.indexOf(blocked) })
    expect(ignored.message).toBe(null)
    expect(round.state.tray.length).toBe(1)
  })

  it('mahjong piles overlap across layers and a corner pile collapses as it empties', () => {
    const round = createRound('mahjong', refs(6), lib(), refs(6), seeded(0.3), 0)
    const state = round.state
    const pile = state.tiles.filter((t) => t.chain && t.col === 0).sort((a, b) => b.layer - a.layer)
    expect(pile.map((t) => t.layer)).toEqual([3, 2, 0])
    const top = tileRect(state, pile[0])
    const base = tileRect(state, pile[2])
    expect(top.top).toBeLessThan(base.top)
    expect(top.left).toBe(base.left)
    expect(top.width).toBe(base.width)
    // A pyramid tile keeps its place while the pile above it is removed.
    const inner = state.tiles.find((t) => !t.chain && t.layer === 0 && t.col === 2 && t.row === 1)
    const innerBefore = tileRect(state, inner).top
    act(round, { type: 'tap', index: state.tiles.indexOf(pile[0]) })
    expect(tileRect(state, pile[1]).top).toBe(top.top)
    expect(tileRect(state, pile[2]).top).toBeLessThan(base.top)
    expect(tileRect(state, inner).top).toBe(innerBefore)
  })

  it('kanatrap plays 10 questions per round and judges the correct reading each time', () => {
    const round = createRound(
      'kanatrap',
      refs(6),
      lib(),
      refs(6),
      seqRandom([0.1, 0.4, 0.7, 0.2, 0.5, 0.8, 0.3, 0.6]),
      0,
    )
    expect(round.state.total).toBe(10)
    expect(round.state.questions.length).toBe(10)
    const seen = new Set()
    for (let i = 0; i < 10; i += 1) {
      expect(round.state.index).toBe(i)
      expect(round.state.options.length).toBe(4)
      expect(new Set(round.state.options).size).toBe(4)
      expect(round.state.options).toContain(round.state.correct)
      expect(round.state.prompt).toBeTruthy()
      expect(round.state.promptZh).toBeTruthy()
      seen.add(round.state.prompt)
      const correct = round.state.options.indexOf(round.state.correct)
      const event = act(round, { type: 'choose', index: correct })
      expect(event.life).toBe(0)
      expect(event.score).toBeGreaterThan(0)
      expect(round.state.phase).toBe('correct')
      expect(round.done).toBe(false)
      act(round, { type: 'next' })
    }
    // Six eligible words: each appears once, then the pool is reused for the
    // remaining four questions, so the round still holds 10.
    expect(seen.size).toBe(6)
    expect(round.done).toBe(true)
    expect(round.cleared).toBe(true)
  })

  it('kanatrap reuses a small pool so a round still holds 10 questions', () => {
    const round = createRound('kanatrap', refs(2), lib(2), refs(2), zeroRandom, 0)
    expect(round.state.total).toBe(10)
    expect(round.state.questions.length).toBe(10)
    expect(new Set(round.state.questions.map((q) => q.prompt)).size).toBe(2)
  })

  it('kanatrap wrong answer reveals, costs a life, and the round goes on to 10', () => {
    const round = createRound('kanatrap', refs(6), lib(), refs(6), seqRandom([0.1, 0.4, 0.7, 0.2, 0.5, 0.8, 0.3, 0.6]), 0)
    const wrong = round.state.options.findIndex((option) => option !== round.state.correct)
    const event = act(round, { type: 'choose', index: wrong })
    expect(event.life).toBe(-1)
    expect(round.state.phase).toBe('reveal')
    expect(round.reveal.text).toBe(round.state.correct)
    expect(round.done).toBe(false)
    act(round, { type: 'confirm' })
    expect(round.state.index).toBe(1)
    expect(round.state.phase).toBe('ask')
    for (let i = 1; i < 10; i += 1) {
      act(round, { type: 'choose', index: round.state.options.indexOf(round.state.correct) })
      act(round, { type: 'next' })
    }
    expect(round.done).toBe(true)
    expect(round.cleared).toBe(true)
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
