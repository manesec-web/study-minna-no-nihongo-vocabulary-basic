import { describe, expect, it } from 'vitest'
import { act, createRound } from './engine.js'
import { evaluateEligibility } from './eligibility.js'
import { colorGuess } from './games/game-wordle.js'
import { COLS, ROWS, START_LENGTH } from './games/game-snake.js'

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

// A tiny deterministic LCG so generated boards are repeatable but not degenerate
// (a constant 0 rng would always probe the same cell).
function seeded(seed) {
  let value = seed
  return () => {
    value = (value * 9301 + 0.49297) % 1
    return value
  }
}

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
  it('all 24 concrete modes are registered and evaluable', () => {
    const eligibility = evaluateEligibility(lib(), [1])
    expect(Object.keys(eligibility).length).toBe(24)
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

  it('snake lays a fine, mostly empty grid with the word along a reserved walk', () => {
    const round = createRound('snake', refs(6), lib(), refs(6), seeded(0.42), 0)
    expect(round.state.phase).toBe('play')
    const state = round.state
    expect(state.grid.length).toBe(COLS * ROWS)
    expect(state.grid.length).toBeGreaterThan(200)
    const filled = state.grid.filter(Boolean)
    // Most cells are empty path space, not a wall of kana.
    expect(filled.length).toBeLessThan(state.grid.length / 4)
    const word = state.queue[0]
    const chars = Array.from(word.kana)
    expect(state.targets.length).toBe(chars.length)
    expect(state.targets.map((at) => state.grid[at].char)).toEqual(chars)
    expect(state.foodAt).toBe(state.targets[0])
    const distractors = filled.filter((cell) => !cell.target)
    expect(distractors.length).toBeGreaterThanOrEqual(15)
    for (const cell of distractors) {
      expect(chars, `distractor ${cell.char}`).not.toContain(cell.char)
    }
    // No kana sits on the reserved walk between the targets, nor under the
    // snake, so the route is open.
    for (const at of [...state.route, ...state.snake]) {
      if (state.targets.includes(at)) continue
      expect(state.grid[at], `cell ${at} on the route`).toBeNull()
    }
    expect(state.snake.length).toBe(START_LENGTH)
    expect(state.dir).toBe('right')
  })

  it('snake finishes the word by following its reserved route', () => {
    for (const seed of [0, 0.37, 0.91]) {
      const round = createRound('snake', refs(6), lib(), refs(6), seeded(seed), 0)
      const state = round.state
      const chars = Array.from(state.queue[0].kana)
      const route = [...state.route]
      route.forEach((at, i) => {
        const head = state.snake[0]
        const dr = Math.floor(at / COLS) - Math.floor(head / COLS)
        const dc = (at % COLS) - (head % COLS)
        const dir = dr < 0 ? 'up' : dr > 0 ? 'down' : dc < 0 ? 'left' : 'right'
        act(round, { type: 'dir', value: dir })
        const event = act(round, { type: 'tick' })
        expect(event.life, `seed ${seed} at ${at}: ${event.message}`).toBe(0)
        // The last kana builds the next level, which starts a fresh snake.
        if (i < route.length - 1) expect(state.snake[0]).toBe(at)
      })
      expect(state.position).toBe(1)
      expect(round.done).toBe(false)
      // The eaten word's kana stayed gone through the whole walk: every tick
      // that reached a target scored, and none cost a life or a respawn.
      expect(round.streak).toBe(chars.length)
    }
  })

  it('snake eats a wrong kana: shrinks, queues it, and it returns in an empty cell', () => {
    const round = createRound('snake', refs(6), lib(), refs(6), zeroRandom, 0)
    const state = round.state
    const chars = Array.from(state.queue[0].kana)
    const wrong = Array.from('あいうえおかきくけこ').find((ch) => !chars.includes(ch))
    const ahead = state.snake[0] + 1
    state.grid[ahead] = { char: wrong, target: false }
    const event = act(round, { type: 'tick' })
    expect(event.life).toBe(0)
    expect(event.respawn).toBe(true)
    expect(state.snake.length).toBe(START_LENGTH - 1)
    expect(state.snake[0]).toBe(ahead)
    expect(state.grid[ahead]).toBeNull()
    expect(state.respawn).toEqual([wrong])

    // The view's delayed dispatch brings it back somewhere empty.
    const before = state.grid.filter(Boolean).length
    act(round, { type: 'respawn' })
    expect(state.respawn).toEqual([])
    expect(state.grid.filter(Boolean).length).toBe(before + 1)
    const back = state.grid.findIndex((cell) => cell?.char === wrong)
    expect(back).toBeGreaterThanOrEqual(0)
    expect(state.snake.includes(back)).toBe(false)
    act(round, { type: 'respawn' }) // nothing queued: a no-op
    expect(state.grid.filter(Boolean).length).toBe(before + 1)
  })

  it('snake wall collision costs a life and resets only the snake', () => {
    const round = createRound('snake', refs(6), lib(), refs(6), zeroRandom, 0)
    const state = round.state
    const head = state.snake[0]
    // Clear the column above the head so the walk to the wall is plain.
    state.grid[head - COLS] = null
    state.grid[head - 2 * COLS] = null
    act(round, { type: 'dir', value: 'up' })
    act(round, { type: 'tick' })
    act(round, { type: 'tick' })
    expect(Math.floor(state.snake[0] / COLS)).toBe(0)
    const eaten = state.grid.map((cell, at) => (cell ? at : -1)).filter((at) => at >= 0)
    const event = act(round, { type: 'tick' })
    expect(event.life).toBe(-1)
    expect(state.snake).toEqual([2 * COLS + START_LENGTH, 2 * COLS + START_LENGTH - 1, 2 * COLS + START_LENGTH - 2])
    expect(state.dir).toBe('right')
    expect(state.grid.map((cell, at) => (cell ? at : -1)).filter((at) => at >= 0)).toEqual(eaten)
  })

  it('falling shoots the matching cannon and misses the wrong one', () => {
    const round = createRound('falling', refs(6), lib(), refs(6), zeroRandom, 0)
    const correct = round.state.cannons.findIndex((c) => c.word === round.state.meteor.word)
    const event = act(round, { type: 'shoot', index: correct })
    expect(event.life).toBe(0)
    expect(event.score).toBeGreaterThan(0)
  })

  it('whack shows one mole at a time on a 1s-up / 2s-down cycle', () => {
    const round = createRound('whack', refs(6), lib(), refs(6), zeroRandom, 0)
    const visible = () => round.state.holes.filter((h) => h.visible)
    expect(visible().length).toBe(1)
    const firstIndex = round.state.visibleIndex
    const firstWord = round.state.lastWord

    act(round, { type: 'tick' }) // 1s up -> hide
    expect(visible().length).toBe(0)
    expect(round.state.cycle).toBe('down')

    act(round, { type: 'tick' }) // down second 1
    expect(visible().length).toBe(0)

    act(round, { type: 'tick' }) // down second 2 -> next mole
    expect(visible().length).toBe(1)
    expect(round.state.visibleIndex).not.toBe(firstIndex)
    expect(round.state.lastWord).not.toBe(firstWord)
  })

  it('whack holes are not all the same word and a wrong tap loses time', () => {
    const round = createRound('whack', refs(6), lib(), refs(6), zeroRandom, 0)
    expect(new Set(round.state.holes.map((h) => h.word)).size).toBeGreaterThan(1)

    // Advance to a wrong mole (the first mole is the correct target).
    act(round, { type: 'tick' })
    act(round, { type: 'tick' })
    act(round, { type: 'tick' })
    const wrongIndex = round.state.visibleIndex
    expect(round.state.holes[wrongIndex].word).not.toBe(round.state.targetWord)
    const before = round.state.remaining
    const event = act(round, { type: 'tap', index: wrongIndex })
    expect(event.life).toBe(0)
    expect(round.state.remaining).toBeLessThan(before)
  })

  it('nokanji prompt has no kanji and chooses a Chinese meaning', () => {
    const round = createRound('nokanji', refs(6), lib(), refs(6), zeroRandom, 0)
    expect(round.state.question.promptFace).toBe('kana')
    expect(/[^\u3040-\u309f]/.test(round.state.question.prompt)).toBe(false)
    const event = act(round, { type: 'choose', index: round.state.question.correctIndex })
    expect(event.life).toBe(0)
    expect(event.score).toBeGreaterThan(0)
  })

  // Regression: `buildQuestion` used to return undefined, so every question
  // after the first was stored as `undefined` and the board rendered blank.
  it('nokanji builds a well-formed question after a correct answer and after a reveal', () => {
    const round = createRound('nokanji', refs(6), lib(), refs(6), zeroRandom, 0)
    const seen = new Set()
    for (let step = 0; step < 5; step += 1) {
      const question = round.state.question
      expect(question, `question ${step}`).toBeTruthy()
      expect(question.promptFace).toBe('kana')
      expect(question.answerFace).toBe('zh')
      expect(/[^\u3040-\u309f]/.test(question.prompt)).toBe(false)
      expect(question.choices.length).toBeGreaterThanOrEqual(2)
      expect(question.choices.filter((choice) => choice.correct).length).toBe(1)
      expect(question.choices[question.correctIndex].correct).toBe(true)
      expect(new Set(question.choices.map((choice) => choice.text)).size).toBe(question.choices.length)
      seen.add(question.prompt)
      if (step % 2 === 0) {
        act(round, { type: 'choose', index: question.correctIndex })
        expect(round.state.phase).toBe('correct')
        act(round, { type: 'next' })
      } else {
        const wrong = question.choices.findIndex((choice) => !choice.correct)
        act(round, { type: 'choose', index: wrong })
        expect(round.state.phase).toBe('reveal')
        expect(round.reveal.text).toBe(question.choices[question.correctIndex].text)
        act(round, { type: 'confirm' })
      }
      expect(round.state.phase).toBe('ask')
    }
    expect(seen.size).toBe(5)
  })

  it('nokanji finishes the round after the last question', () => {
    const round = createRound('nokanji', refs(3), lib(3), refs(3), zeroRandom, 0)
    for (let i = 0; i < 3; i += 1) {
      act(round, { type: 'choose', index: round.state.question.correctIndex })
      act(round, { type: 'next' })
    }
    expect(round.done).toBe(true)
    expect(round.cleared).toBe(true)
    expect(round.state.phase).toBe('done')
  })
})
