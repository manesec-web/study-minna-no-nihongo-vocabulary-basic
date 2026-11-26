import { describe, expect, it } from 'vitest'
import { act, createRound } from './engine.js'
import { evaluateEligibility } from './eligibility.js'
import { colorGuess } from './games/game-wordle.js'

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

const CROSS_WORDS = [
  { japanese: 'どうやって', kanji: null, chinese: '怎樣，如何' },
  { japanese: 'どの', kanji: null, chinese: '哪個～（用於三者或以上）' },
  { japanese: 'やめます', kanji: null, chinese: '辭職，停止，放棄' },
  { japanese: 'のります', kanji: null, chinese: '搭乘〔電車〕' },
  { japanese: 'てら', kanji: null, chinese: '寺廟' },
  { japanese: 'のりかえます', kanji: null, chinese: '換車' },
]

function crossLib() {
  const vols = CROSS_WORDS
  return {
    getVols: (lesson) => (lesson === 1 ? vols : []),
    entry: ({ lesson, index }) => (lesson === 1 ? vols[index] ?? null : null),
  }
}

function seqRandom(values) {
  let index = 0
  return () => values[index++ % values.length]
}

describe('new quiz modes', () => {
  it('all 27 concrete modes are registered and evaluable', () => {
    const eligibility = evaluateEligibility(lib(), [1])
    expect(Object.keys(eligibility).length).toBe(27)
    for (const mode of Object.keys(eligibility)) {
      expect(eligibility[mode]).toHaveProperty('ok')
      expect(eligibility[mode]).toHaveProperty('reason')
    }
  })

  it('swipe judges a true pairing and advances to the next question', () => {
    const round = createRound('swipe', refs(6), lib(), refs(6), zeroRandom, 0)
    expect(round.state.question).toBeTruthy()
    const value = round.state.question.isMatch
    const event = act(round, { type: 'judge', value })
    expect(event.life).toBe(0)
    expect(event.score).toBeGreaterThan(0)
    expect(round.state.position).toBe(1)
  })

  it('swipe wrong judgement loses a life and reveals', () => {
    const round = createRound('swipe', refs(6), lib(), refs(6), zeroRandom, 0)
    const wrong = !round.state.question.isMatch
    const event = act(round, { type: 'judge', value: wrong })
    expect(event.life).toBe(-1)
    expect(round.state.phase).toBe('reveal')
  })

  it('oddone has exactly one mismatched group', () => {
    const round = createRound('oddone', refs(6), lib(), refs(6), zeroRandom, 0)
    expect(round.state.groups.length).toBe(4)
    expect(round.state.oddIndex).toBeGreaterThanOrEqual(0)
    const event = act(round, { type: 'tap', index: round.state.oddIndex })
    expect(event.life).toBe(0)
    expect(event.score).toBeGreaterThan(0)
  })

  it('fillblank offers eight unique options and accepts the missing grapheme', () => {
    const round = createRound(
      'fillblank',
      refs(6),
      lib(),
      refs(6),
      seqRandom([0.1, 0.3, 0.5, 0.7, 0.9, 0.2, 0.4, 0.6, 0.8]),
      0,
    )
    expect(round.state.options.length).toBe(8)
    expect(new Set(round.state.options).size).toBe(8)
    const correct = round.state.options.indexOf(round.state.correct)
    expect(correct).toBeGreaterThanOrEqual(0)
    const event = act(round, { type: 'choose', index: correct })
    expect(event.life).toBe(0)
    expect(event.score).toBeGreaterThan(0)
  })

  it('wordle colours repeated kana with the two-pass rule', () => {
    expect(colorGuess('たべる', 'たべる')).toEqual(['green', 'green', 'green'])
    expect(colorGuess('たべる', 'るべた')).toEqual(['yellow', 'green', 'yellow'])
  })

  it('wordle wins after typing the target and rejects the wrong length', () => {
    const round = createRound('wordle', refs(6), lib(), refs(6), zeroRandom, 0)
    const target = round.state.target
    // A too-short submit does not consume a guess.
    act(round, { type: 'input', value: target[0] })
    act(round, { type: 'submit' })
    expect(round.state.guesses.length).toBe(0)
    // Backspace, type the full target, and submit.
    act(round, { type: 'backspace' })
    for (const ch of target) act(round, { type: 'input', value: ch })
    act(round, { type: 'submit' })
    expect(round.state.guesses.length).toBe(1)
    expect(round.done).toBe(true)
    expect(round.cleared).toBe(true)
  })

  it('crossword builds a connected 4+ word layout and can be completed', () => {
    const round = createRound(
      'crossword',
      refs(6),
      crossLib(),
      refs(6),
      () => 0.9,
      0,
    )
    expect(round.state.layout).toBeTruthy()
    expect(round.state.layout.words.length).toBeGreaterThanOrEqual(4)
    const layout = round.state.layout
    for (let row = 0; row < layout.cells.length; row += 1) {
      for (let col = 0; col < layout.cells[row].length; col += 1) {
        const cell = layout.cells[row][col]
        if (!cell.char) continue
        act(round, { type: 'tap', value: { row, col } })
        act(round, { type: 'input', value: cell.char })
      }
    }
    const event = act(round, { type: 'check' })
    expect(round.done).toBe(true)
    expect(round.cleared).toBe(true)
    expect(event.score).toBeGreaterThan(0)
  })

  it('crossword starts playable for ordinary verbs that share a trailing ます', () => {
    const round = createRound('crossword', refs(10), lib(), refs(10), () => 0.37, 0)
    expect(round.done).toBe(false)
    expect(round.state.phase).toBe('play')
    expect(round.state.layout).toBeTruthy()
    expect(round.state.layout.words.length).toBeGreaterThanOrEqual(4)
    const playable = round.state.layout.cells.flat().filter((cell) => cell.char)
    expect(playable.length).toBeGreaterThanOrEqual(8)
    expect(playable.every((cell) => !cell.filled)).toBe(true)
    // Hint indices must point into the packed layout.words list.
    for (const cell of playable) {
      expect(cell.words.length).toBeGreaterThan(0)
      for (const index of cell.words) {
        expect(round.state.layout.words[index]).toBeTruthy()
        expect(round.state.layout.words[index].zh).toBeTruthy()
      }
    }
  })

  it('snake keeps eaten kana visible and highlights only the next letter', () => {
    const round = createRound('snake', refs(6), lib(), refs(6), zeroRandom, 0)
    expect(round.state.phase).toBe('play')
    const start = round.state.snake[0]
    const word = round.state.queue[round.state.position]
    const chars = Array.from(word.kana)
    expect(round.state.foodAt).toBe(start + 1)
    expect(round.state.grid[start + 1].char).toBe(chars[0])
    const event = act(round, { type: 'tick' })
    expect(event.message).toBe('吃一字')
    expect(round.done).toBe(false)
    const head = round.state.snake[0]
    expect(head).toBe(start + 1)
    expect(round.state.grid[head].char).toBe(chars[0])
    expect(round.state.snake.includes(start)).toBe(false)
    expect(round.state.grid[start]?.char).toBeTruthy()
    expect(round.state.foodAt).toBe(start + 2)
    expect(round.state.grid.every((cell) => cell?.char)).toBe(true)
    const targets = round.state.grid.filter((cell) => cell?.target)
    expect(targets.length).toBe(chars.length - 1)
  })

  it('trimatch clears three cards of the same word', () => {
    const round = createRound('trimatch', refs(6), lib(), refs(6), zeroRandom, 0)
    expect(round.state.variant).toBe('triple')
    const ref0 = round.state.cards.find((c) => !c.cleared).ref
    const trio = round.state.cards
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.ref === ref0 && !c.cleared)
      .slice(0, 3)
      .map(({ i }) => i)
    expect(trio.length).toBe(3)
    for (const i of trio) act(round, { type: 'tap', index: i })
    expect(round.state.cards[trio[0]].cleared).toBe(true)
  })

  it('falling shoots the matching cannon and misses the wrong one', () => {
    const round = createRound('falling', refs(6), lib(), refs(6), zeroRandom, 0)
    const correct = round.state.cannons.findIndex((c) => c.word === round.state.meteor.word)
    const event = act(round, { type: 'shoot', index: correct })
    expect(event.life).toBe(0)
    expect(event.score).toBeGreaterThan(0)
  })

  it('whack has a visible correct hole and penalises a wrong tap with time', () => {
    const round = createRound('whack', refs(6), lib(), refs(6), zeroRandom, 0)
    expect(round.state.holes.length).toBe(9)
    const correctVisible = round.state.holes.find((h) => h.word === round.state.targetWord && h.visible)
    expect(correctVisible).toBeTruthy()
    const wrong = round.state.holes.find((h) => h.word !== round.state.targetWord && h.visible)
    const before = round.state.remaining
    if (wrong) {
      act(round, { type: 'tap', index: round.state.holes.indexOf(wrong) })
      expect(round.state.remaining).toBeLessThan(before)
    }
  })

  it('nokanji prompt has no kanji and chooses a Chinese meaning', () => {
    const round = createRound('nokanji', refs(6), lib(), refs(6), zeroRandom, 0)
    expect(round.state.question.promptFace).toBe('kana')
    expect(/[\u4e00-\u9fff]/.test(round.state.question.prompt)).toBe(false)
    const event = act(round, { type: 'choose', index: round.state.question.correctIndex })
    expect(event.life).toBe(0)
    expect(event.score).toBeGreaterThan(0)
  })

  it('furigana shows kanji and picks the reading', () => {
    const round = createRound('furigana', refs(6), lib(), refs(6), zeroRandom, 0)
    expect(/[\u4e00-\u9fff]/.test(round.state.prompt)).toBe(true)
    const correct = round.state.options.indexOf(round.state.correct)
    const event = act(round, { type: 'choose', index: correct })
    expect(event.life).toBe(0)
    expect(event.score).toBeGreaterThan(0)
  })
})
