import { describe, expect, it } from 'vitest'
import {
  act,
  beginNext,
  buildQuizRun,
  createRound,
  CONNECT_COLS,
  CONNECT_ROWS,
  drawModeAt,
  ensureMatch3Move,
  findConnectPath,
  findMatch3Group,
  hasConnectMove,
  hasMatch3Move,
  timeSeconds,
} from './engine.js'
import { CONCRETE_MODES, DRAW_CARDS } from './modes.js'
import { faceOf } from './faces.js'

const WORDS = [
  { japanese: 'あか', kanji: '赤', chinese: '紅' },
  { japanese: 'いぬ', kanji: '犬', chinese: '狗' },
  { japanese: 'うみ', kanji: '海', chinese: '海' },
  { japanese: 'えき', kanji: '駅', chinese: '車站' },
  { japanese: 'おと', kanji: '音', chinese: '聲音' },
  { japanese: 'かさ', kanji: '傘', chinese: '雨傘' },
  { japanese: 'きく', kanji: '菊', chinese: '菊花' },
  { japanese: 'くり', kanji: '栗', chinese: '栗子' },
  { japanese: 'けさ', kanji: '今朝', chinese: '早晨' },
  { japanese: 'こえ', kanji: '声', chinese: '人聲' },
  { japanese: 'さけ', kanji: '酒', chinese: '清酒' },
  { japanese: 'しお', kanji: '塩', chinese: '鹽巴' },
]

function fakeLibrary(count = WORDS.length) {
  const vols = WORDS.slice(0, count)
  return {
    getVols: (lesson) => (lesson === 1 ? vols : []),
    entry: ({ lesson, index }) => (lesson === 1 ? vols[index] ?? null : null),
    hasEntries: (lesson) => lesson === 1 && vols.length > 0,
    entryLessons: () => (vols.length ? [1] : []),
    lessonCount: () => 1,
  }
}

const setup = {
  lessons: [1],
  count: 'all',
  modes: ['choice', 'pairs'],
  random: false,
  lives: 3,
  time: 'infinite',
}

function refs(n) {
  return Array.from({ length: n }, (_v, index) => ({ lesson: 1, index }))
}

const zeroRandom = () => 0

// The ten 第16課 words that make up the user's 消除下落 screenshot, in the
// batch order used by that board. 顔 / かお / 臉 are the same word (index 6).
const L16 = [
  { japanese: 'いれます', kanji: '入れます', chinese: '放入，放進' },
  { japanese: 'だします', kanji: '出します', chinese: '拿出，取出' },
  { japanese: 'やめます', kanji: null, chinese: '辭職，停止，放棄' },
  { japanese: 'みじかい', kanji: '短い', chinese: '短' },
  { japanese: 'あたまがいい', kanji: '頭がいい', chinese: '頭腦好，聰明' },
  { japanese: 'かみ', kanji: '髪', chinese: '頭髮' },
  { japanese: 'かお', kanji: '顔', chinese: '臉' },
  { japanese: 'は', kanji: '歯', chinese: '牙齒' },
  { japanese: 'おなか', kanji: null, chinese: '肚子' },
  { japanese: 'てら', kanji: '寺', chinese: '寺廟' },
]

function l16Library() {
  const vols = L16
  return {
    getVols: (lesson) => (lesson === 1 ? vols : []),
    entry: ({ lesson, index }) => (lesson === 1 ? vols[index] ?? null : null),
  }
}

// The screenshot board as word ids (0-index, row-major). The vertical 顔/かお/臉
// run is cells 2, 7, 12 (all word 6).
const L16_BOARD = [
  2, 1, 6, 8, 1,
  2, 5, 6, 8, 0,
  6, 3, 6, 4, 5,
  1, 0, 2, 7, 3,
  9, 3, 2, 0, 3,
]

function boardCells(words) {
  return words.map((word) => ({ word, face: 'jp', selected: false, cleared: false }))
}

function seqRandom(values) {
  let index = 0
  return () => values[index++ % values.length]
}

describe('quiz engine', () => {
  it('batches words by 10 and resolves the mode pool', () => {
    const run = buildQuizRun(fakeLibrary(12), setup, zeroRandom)
    expect(run.words.length).toBe(12)
    expect(run.batches.map((batch) => batch.length)).toEqual([10, 2])
    expect(run.pool).toEqual(['choice', 'pairs'])
    expect(run.lives).toBe(3)
  })

  it('falls back to every concrete mode when none is checked', () => {
    const run = buildQuizRun(fakeLibrary(12), { ...setup, modes: [] }, zeroRandom)
    expect(run.pool).toEqual(CONCRETE_MODES)
  })

  it('slices to the requested count', () => {
    const run = buildQuizRun(fakeLibrary(12), { ...setup, count: 30 }, zeroRandom)
    expect(run.words.length).toBe(12)
    expect(run.batches.length).toBe(2)
  })

  it('builds an ordered sequence with roundIndex and a random draw', () => {
    const run = buildQuizRun(fakeLibrary(12), setup, zeroRandom)
    run.roundIndex = 0
    beginNext(run, fakeLibrary(12), zeroRandom, timeSeconds('infinite'))
    expect(run.phase).toBe('round')
    expect(run.round.mode).toBe('choice')
    expect(run.round.words.length).toBe(10)

    const randomRun = buildQuizRun(fakeLibrary(12), { ...setup, random: true }, zeroRandom)
    randomRun.roundIndex = 0
    beginNext(randomRun, fakeLibrary(12), zeroRandom, timeSeconds('infinite'))
    expect(randomRun.phase).toBe('draw')
    expect(randomRun.draw.cards.length).toBe(DRAW_CARDS)
    // Leftover modes on a random setup must not shrink the draw pool.
    expect(randomRun.pool).toEqual(CONCRETE_MODES)
    const card = drawModeAt(randomRun, 0)
    expect(CONCRETE_MODES).toContain(card)
  })

  it('creates a choice round with 5 choices and the correct answer present', () => {
    const round = createRound('choice', refs(5), fakeLibrary(), refs(12), zeroRandom, 0)
    expect(round.mode).toBe('choice')
    expect(round.state.question.choices.length).toBe(5)
    expect(round.state.question.correctIndex).toBeGreaterThanOrEqual(0)
    expect(round.state.question.choices[round.state.question.correctIndex].correct).toBe(true)
  })

  it('judges a correct choice and advances with quiz.next', () => {
    const round = createRound('choice', refs(3), fakeLibrary(), refs(12), zeroRandom, 0)
    const correct = round.state.question.correctIndex
    const event = act(round, { type: 'choose', index: correct })
    expect(event.life).toBe(0)
    expect(event.score).toBeGreaterThan(0)
    expect(round.state.phase).toBe('correct')

    const nextEvent = act(round, { type: 'next' })
    expect(nextEvent.clock).toBe('start')
    expect(round.state.phase).toBe('ask')
    expect(round.state.index).toBe(1)
  })

  it('judges a wrong choice and reveals the correct answer', () => {
    const round = createRound('choice', refs(3), fakeLibrary(), refs(12), zeroRandom, 0)
    const wrong = (round.state.question.correctIndex + 1) % round.state.question.choices.length
    const event = act(round, { type: 'choose', index: wrong })
    expect(event.life).toBe(-1)
    expect(round.state.phase).toBe('reveal')
    expect(round.reveal.text).toBe(
      round.state.question.choices[round.state.question.correctIndex].text,
    )

    const confirm = act(round, { type: 'confirm' })
    expect(confirm.clock).toBe('start')
    expect(round.state.phase).toBe('ask')
  })

  it('matches a pair in 翻卡配對 and clears the round when all pairs match', () => {
    const round = createRound('pairs', refs(4), fakeLibrary(), refs(4), zeroRandom, 0)
    act(round, { type: 'resolve' }) // end the opening peek
    const cards = round.state.cards
    const first = cards.findIndex((c) => !c.matched)
    const second = cards.findIndex((c, at) => at !== first && c.word === cards[first].word)
    expect(second).toBeGreaterThanOrEqual(0)

    act(round, { type: 'tap', index: first })
    const event = act(round, { type: 'tap', index: second })
    expect(event.life).toBe(0)
    expect(cards[first].matched).toBe(true)
    expect(cards[second].matched).toBe(true)
  })

  it('a wrong pair keeps both faces open and locked until resolve closes them', () => {
    const round = createRound('pairs', refs(4), fakeLibrary(), refs(4), zeroRandom, 0)
    act(round, { type: 'resolve' }) // end the opening peek
    const cards = round.state.cards
    const a = cards.findIndex((c) => c.word === 0)
    const b = cards.findIndex((c) => c.word !== 0)
    act(round, { type: 'tap', index: a })
    const event = act(round, { type: 'tap', index: b })
    expect(event.life).toBe(-1)
    expect(cards[a].open).toBe(true)
    expect(cards[b].open).toBe(true)
    expect(round.state.locked).toBe(true)

    // A tap during the hold is ignored.
    const other = cards.findIndex((c, at) => at !== a && at !== b && !c.matched)
    const ignored = act(round, { type: 'tap', index: other })
    expect(ignored.life).toBe(0)
    expect(round.state.locked).toBe(true)

    // Resolve closes both and clears the flash.
    act(round, { type: 'resolve' })
    expect(cards[a].open).toBe(false)
    expect(cards[b].open).toBe(false)
    expect(cards[a].flash).toBe(false)
    expect(cards[b].flash).toBe(false)
    expect(round.state.locked).toBe(false)
    expect(round.state.open).toEqual([])
  })

  it('pairs opens with an all-face-up peek that locks the board until resolve', () => {
    const round = createRound('pairs', refs(4), fakeLibrary(), refs(4), zeroRandom, 0)
    expect(round.state.peek).toBe(true)
    expect(round.state.locked).toBe(true)

    const ignored = act(round, { type: 'tap', index: 0 })
    expect(ignored.life).toBe(0)
    expect(round.state.cards[0].open).toBe(false)

    act(round, { type: 'resolve' })
    expect(round.state.peek).toBe(false)
    expect(round.state.locked).toBe(false)
  })

  it('pairs holds the countdown during the peek and starts it on resolve', () => {
    const round = createRound('pairs', refs(4), fakeLibrary(), refs(4), zeroRandom, 5)
    expect(round.clock.active).toBe(false)
    expect(act(round, { type: 'resolve' }).clock).toBe('start')
    expect(round.state.locked).toBe(false)
  })

  it('match3 opens with a clearable group and refills keep one', () => {
    const round = createRound('match3', refs(6), fakeLibrary(), refs(6), zeroRandom, 0)
    expect(hasMatch3Move(round.state.cells)).toBe(true)
    act(round, { type: 'resolve' }) // end the opening drop-in

    // zeroRandom fills every cell with word 0, so 0–1–2 is a straight run.
    act(round, { type: 'tap', index: 0 })
    act(round, { type: 'tap', index: 1 })
    const event = act(round, { type: 'tap', index: 2 })
    expect(event.life).toBe(0)
    expect(event.score).toBeGreaterThan(0)
    act(round, { type: 'resolve' }) // gravity refills after the clear pop
    expect(hasMatch3Move(round.state.cells)).toBe(true)
  })

  it('match3 changing to a non-adjacent different word just reselects without a life loss', () => {
    const round = createRound('match3', refs(6), fakeLibrary(), refs(6), zeroRandom, 0)
    act(round, { type: 'resolve' }) // end the opening drop-in
    round.state.cells[24].word = 1
    const cells = round.state.cells
    act(round, { type: 'tap', index: 0 })
    const event = act(round, { type: 'tap', index: 24 })
    expect(event.life).toBe(0)
    expect(event.clock).toBe(null)
    expect(round.state.selected).toEqual([24])
    expect(cells[24].selected).toBe(true)
    expect(cells[0].selected).toBe(false)
  })

  it('match3 extending the chain with a neighbouring different word costs a life', () => {
    const round = createRound('match3', refs(6), fakeLibrary(), refs(6), zeroRandom, 0)
    act(round, { type: 'resolve' }) // end the opening drop-in
    round.state.cells[1].word = 1
    act(round, { type: 'tap', index: 0 })
    const event = act(round, { type: 'tap', index: 1 })
    expect(event.life).toBe(-1)
    expect(round.state.selected).toEqual([])
  })

  it('connect returns a real path and clears only after resolve', () => {
    const round = createRound('connect', refs(6), fakeLibrary(), refs(6), zeroRandom, 0)
    const cells = round.state.cells
    expect(hasConnectMove(cells)).toBe(true)

    let a = -1
    let b = -1
    for (let i = 0; i < cells.length && a === -1; i += 1) {
      for (let j = i + 1; j < cells.length && a === -1; j += 1) {
        if (cells[i].word === cells[j].word && findConnectPath(cells, i, j)) {
          a = i
          b = j
        }
      }
    }
    expect(a).toBeGreaterThanOrEqual(0)

    act(round, { type: 'tap', index: a })
    const event = act(round, { type: 'tap', index: b })
    expect(event.life).toBe(0)
    expect(round.state.locked).toBe(true)
    expect(Array.isArray(round.state.path)).toBe(true)
    expect(round.state.path[0]).toBe(a)
    expect(round.state.path[round.state.path.length - 1]).toBe(b)
    expect(new Set(round.state.path).size).toBe(round.state.path.length)
    expect(cells[a].cleared).toBe(false)
    expect(cells[b].cleared).toBe(false)

    act(round, { type: 'resolve' })
    expect(cells[a].cleared).toBe(true)
    expect(cells[b].cleared).toBe(true)
    expect(round.state.locked).toBe(false)
    expect(round.state.path).toBe(null)
    expect(hasConnectMove(cells)).toBe(true)
  })

  it('findConnectPath returns null for a blocked pair', () => {
    const cells = []
    for (let i = 0; i < CONNECT_COLS * CONNECT_ROWS; i += 1) cells.push({ word: i % 2, cleared: false })
    // Two cards at opposite corners of a full board cannot connect through
    // cleared cells because nothing is cleared yet and they are not adjacent.
    expect(findConnectPath(cells, 0, CONNECT_COLS * CONNECT_ROWS - 1)).toBe(null)
  })

  it('findMatch3Group finds an L-shaped connected group, not just a straight run', () => {
    const cells = boardCells(Array.from({ length: 25 }, (_v, i) => i + 1))
    cells[0].word = 0
    cells[5].word = 0
    cells[6].word = 0
    const group = findMatch3Group(cells)
    expect(group).not.toBeNull()
    expect([...group].sort((a, b) => a - b)).toEqual([0, 5, 6])
  })

  it('the real 第16課 screenshot board is solvable by the vertical 顔/かお/臉 run', () => {
    const round = createRound('match3', refs(10), l16Library(), refs(10), zeroRandom, 0)
    act(round, { type: 'resolve' }) // end the opening drop-in
    round.state.cells = boardCells(L16_BOARD)

    const group = findMatch3Group(round.state.cells)
    expect(group).not.toBeNull()
    expect([...group].sort((a, b) => a - b)).toEqual([2, 7, 12])

    // 0-index, row-major: tap the vertical run and it clears. Gravity then
    // replaces `state.cells`, so keep a reference to the pre-clear board.
    const originalCells = round.state.cells
    act(round, { type: 'tap', index: 2 })
    act(round, { type: 'tap', index: 7 })
    const event = act(round, { type: 'tap', index: 12 })
    expect(event.life).toBe(0)
    expect(event.score).toBeGreaterThan(0)
    act(round, { type: 'resolve' }) // gravity runs after the clear pop
    expect(originalCells[2].cleared).toBe(true)
    expect(originalCells[7].cleared).toBe(true)
    expect(originalCells[12].cleared).toBe(true)
    expect(hasMatch3Move(round.state.cells)).toBe(true)
  })

  it('match3 penalises a non-adjacent cell of the same word', () => {
    const round = createRound('match3', refs(6), fakeLibrary(), refs(6), zeroRandom, 0)
    act(round, { type: 'resolve' }) // end the opening drop-in
    act(round, { type: 'tap', index: 0 })
    const event = act(round, { type: 'tap', index: 24 })
    expect(event.life).toBe(-1)
    expect(round.state.selected).toEqual([])
  })

  it('match3 opens with a legal move across several deterministic seeds', () => {
    const seeds = [() => 0, () => 0.3, () => 0.5, () => 0.7, () => 0.9]
    for (const rng of seeds) {
      const round = createRound('match3', refs(10), l16Library(), refs(10), rng, 0)
      expect(hasMatch3Move(round.state.cells)).toBe(true)
      expect(findMatch3Group(round.state.cells)).not.toBeNull()
    }
  })

  it('match3 wins after 10 clears, not 10 tiles', () => {
    const round = createRound('match3', refs(6), fakeLibrary(), refs(6), zeroRandom, 0)
    act(round, { type: 'resolve' }) // end the opening drop-in
    round.state.clearCount = 9

    // zeroRandom fills every cell with word 0: tapping 0–1–2 clears one group.
    act(round, { type: 'tap', index: 0 })
    act(round, { type: 'tap', index: 1 })
    const event = act(round, { type: 'tap', index: 2 })
    expect(event.life).toBe(0)
    expect(round.state.clearCount).toBe(10)
    // The round completes after the clear pop (on resolve), like other modes.
    expect(round.done).toBe(false)
    act(round, { type: 'resolve' })
    expect(round.done).toBe(true)
    expect(round.cleared).toBe(true)
  })

  it('match3 never relies on a fixed top-left three-cell stamp', () => {
    const faces = refs(4)
    const checker = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]
    const lcg = (seed) => {
      let state = seed
      return () => {
        state = (state * 1664525 + 1013904223) % 4294967296
        return state / 4294967296
      }
    }
    const groups = new Set()
    for (let seed = 1; seed <= 24; seed += 1) {
      const cells = checker.map((word) => ({
        word,
        face: 'jp',
        selected: false,
        cleared: false,
        fresh: true,
      }))
      const fixed = ensureMatch3Move(cells, faces, lcg(seed))
      const group = findMatch3Group(fixed)
      expect(group).not.toBeNull()
      groups.add([...group].sort((a, b) => a - b).join(','))
    }
    // The guaranteed group varies across seeds instead of being pinned to the
    // same three cells every round.
    expect(groups.size).toBeGreaterThan(1)
  })

  it('reaction uses different prompt and answer languages with unique options', () => {
    const round = createRound('reaction', refs(6), fakeLibrary(), refs(6), zeroRandom, 0)
    expect(round.state.target.face).not.toBe(round.state.cards[0].face)
    const answerFace = round.state.cards[0].face
    for (const card of round.state.cards) expect(card.face).toBe(answerFace)
    const texts = round.state.cards.map((card) => faceOf(round.faces[card.word], card.face))
    expect(new Set(texts).size).toBe(texts.length)
    expect(round.state.cards.filter((card) => card.word === round.state.target.word).length).toBe(1)
  })

  it('reaction keeps the board on a wrong tap and clears the flash on the next hit', () => {
    const round = createRound('reaction', refs(6), fakeLibrary(), refs(6), zeroRandom, 0)
    const before = round.state.cards.map((card) => card.word).join(',')
    const wrongIndex = round.state.cards.findIndex((card) => card.word !== round.state.target.word)
    const wrongEvent = act(round, { type: 'tap', index: wrongIndex })
    expect(wrongEvent.life).toBe(-1)
    expect(round.state.flash).toBe(wrongIndex)
    expect(round.state.cards.map((card) => card.word).join(',')).toBe(before)

    const correctIndex = round.state.cards.findIndex((card) => card.word === round.state.target.word)
    act(round, { type: 'tap', index: correctIndex })
    expect(round.state.flash).toBe(-1)
    expect(round.state.hit).toBe(1)
  })

  it('boss HP decreases on a correct answer and never increases on a wrong one', () => {
    const round = createRound('boss', refs(5), fakeLibrary(), refs(5), zeroRandom, 0)
    const startHp = round.state.hp

    act(round, { type: 'choose', index: round.state.question.correctIndex })
    expect(round.state.hp).toBeLessThan(startHp)
    const afterCorrect = round.state.hp

    act(round, { type: 'next' })
    const wrong = (round.state.question.correctIndex + 1) % round.state.question.choices.length
    act(round, { type: 'choose', index: wrong })
    expect(round.state.hp).toBe(afterCorrect)
    act(round, { type: 'confirm' })
    expect(round.state.hp).toBe(afterCorrect)
  })

  it('memory starts with a stacked pile and deals three slots on tap', () => {
    const round = createRound('memory', refs(6), fakeLibrary(), refs(6), zeroRandom, 0)
    expect(round.state.phase).toBe('stack')
    expect(round.state.slots.length).toBe(3)
    expect(round.state.slots.every((s) => s.placed === -1 && s.correct === null)).toBe(true)
    expect(round.state.choices.length).toBe(6)

    act(round, { type: 'tap', index: 0 })
    expect(round.state.phase).toBe('deal')
    act(round, { type: 'next' })
    expect(round.state.phase).toBe('countdown')
    act(round, { type: 'next' })
    expect(round.state.phase).toBe('ask')
  })

  it('memory grades all three together and advances after a correct group', () => {
    const round = createRound('memory', refs(6), fakeLibrary(), refs(6), zeroRandom, 0)
    act(round, { type: 'tap', index: 0 })
    act(round, { type: 'next' })
    act(round, { type: 'next' }) // -> ask

    const answerOf = (slot) => faceOf(round.faces[slot.word], 'zh')
    const choiceFor = (slot) =>
      round.state.choices.findIndex((c) => !c.used && c.text === answerOf(slot))

    // The first two placements fill slots without submitting.
    act(round, { type: 'choose', index: choiceFor(round.state.slots[0]) })
    expect(round.state.phase).toBe('ask')
    act(round, { type: 'choose', index: choiceFor(round.state.slots[1]) })
    expect(round.state.phase).toBe('ask')
    expect(round.state.slots.filter((s) => s.placed >= 0).length).toBe(2)

    const event = act(round, { type: 'choose', index: choiceFor(round.state.slots[2]) })
    expect(event.life).toBe(0)
    expect(event.score).toBeGreaterThan(0)
    expect(round.state.phase).toBe('check')
    expect(round.state.slots.every((s) => s.correct)).toBe(true)

    act(round, { type: 'confirm' })
    expect(round.state.groupIndex).toBe(1)
    expect(round.state.phase).toBe('stack')
  })

  it('memory wrong group loses a life and retries the same group', () => {
    const round = createRound('memory', refs(6), fakeLibrary(), refs(6), zeroRandom, 0)
    act(round, { type: 'tap', index: 0 })
    act(round, { type: 'next' })
    act(round, { type: 'next' }) // -> ask

    const answerOf = (slot) => faceOf(round.faces[slot.word], 'zh')
    const choiceFor = (slot) =>
      round.state.choices.findIndex((c) => !c.used && c.text === answerOf(slot))
    const wrong = round.state.choices.findIndex((c) => !c.correct)

    act(round, { type: 'choose', index: choiceFor(round.state.slots[0]) })
    act(round, { type: 'choose', index: choiceFor(round.state.slots[1]) })
    const event = act(round, { type: 'choose', index: wrong })
    expect(event.life).toBe(-1)
    expect(round.state.phase).toBe('check')
    expect(round.state.slots.some((s) => s.correct === false)).toBe(true)
    expect(round.state.slots.every((s) => s.correct !== null)).toBe(true)

    act(round, { type: 'confirm' })
    expect(round.state.phase).toBe('ask')
    expect(round.state.groupIndex).toBe(0) // retry the same group
    expect(round.state.slots.every((s) => s.placed === -1 && s.correct === null)).toBe(true)
    expect(round.state.choices.every((c) => !c.used)).toBe(true)
  })

  it('memory holds the clock until the choices are interactable', () => {
    const round = createRound('memory', refs(6), fakeLibrary(), refs(6), zeroRandom, 5)
    expect(round.clock.active).toBe(false)
    expect(act(round, { type: 'tap', index: 0 }).clock).toBe(null)
    expect(act(round, { type: 'next' }).clock).toBe(null) // reveal -> countdown
    expect(act(round, { type: 'next' }).clock).toBe('start') // countdown -> ask
  })

  it('spell builds eight tiles for a short word and keeps long words whole', () => {
    const shortRound = createRound('spell', refs(1), fakeLibrary(), refs(1), zeroRandom, 0)
    expect(shortRound.state.tiles.length).toBe(8)

    const longLibrary = {
      entry: () => ({ japanese: 'あいうえおかきくけこ', kanji: null, chinese: '長' }),
    }
    const longRound = createRound(
      'spell',
      [{ lesson: 1, index: 0 }],
      longLibrary,
      [{ lesson: 1, index: 0 }],
      zeroRandom,
      0,
    )
    expect(longRound.state.tiles.length).toBe(10)
  })

  it('every concrete mode builds and acts without throwing', () => {
    for (const mode of CONCRETE_MODES) {
      const count = mode === 'connect' ? 8 : 6
      const round = createRound(mode, refs(count), fakeLibrary(count), refs(count), zeroRandom, 10)
      expect(round.mode).toBe(mode)
      // A tap and a timeout must both return an event shape without throwing,
      // even if the specific tap is not a valid move for that mode.
      const tapEvent = act(round, { type: 'tap', index: 0 })
      expect(tapEvent).toHaveProperty('life')
      expect(tapEvent).toHaveProperty('clock')
      const timeoutEvent = act(round, { type: 'timeout' })
      expect(timeoutEvent).toHaveProperty('life')
    }
  })

  it('a timeout ends 翻卡配對 without a life loss', () => {
    const round = createRound('pairs', refs(4), fakeLibrary(), refs(4), zeroRandom, 5)
    const event = act(round, { type: 'timeout' })
    expect(event.life).toBe(0)
    expect(event.clock).toBe('stop')
    expect(round.done).toBe(true)
    expect(round.cleared).toBe(false)
  })
})
