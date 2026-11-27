// Quiz round engine. Pure state transitions: it builds the run, generates one
// round of mode state, and applies a tap/choose/confirm/timeout action to that
// state. It never touches the DOM and never persists anything — the command
// layer owns the session and storage. Word bodies are resolved through the
// injected library at round build time; the session only keeps item references.
import { shuffle } from '../shuffle.js'
import { CONCRETE_MODES, DRAW_CARDS, resolveModePool } from './modes.js'
import { faceOf, FACES, sameRef, wordFace } from './faces.js'
import { requestedWordCount } from './setup.js'
import { NEW_GAMES } from './games/index.js'

export function timeSeconds(time) {
  return time === 'infinite' ? 0 : Number(time)
}

export function allRefs(library, lessons) {
  const refs = []
  for (const lesson of lessons) {
    const vols = library?.getVols ? library.getVols(lesson) : []
    for (let index = 0; index < vols.length; index += 1) refs.push({ lesson, index })
  }
  return refs
}

function rng01(rng) {
  const value = Number(rng()) || 0
  return Math.min(0.999999, Math.max(0, value))
}

function pick(arr, rng) {
  if (!arr.length) return undefined
  return arr[Math.floor(rng01(rng) * arr.length)]
}

function shuffled(arr, rng) {
  return shuffle([...arr], rng)
}

function chunk(items, size) {
  const out = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

// Build the frozen quiz run from the setup and the dictionary. `words` is the
// shuffled word list (sliced to the requested count), `batches` are the
// ≤10-word rounds, and `pool` is the ordered concrete-mode list.
export function buildQuizRun(library, setup, rng = Math.random) {
  const refs = allRefs(library, setup.lessons)
  const words = shuffled(refs, rng).slice(0, requestedWordCount(setup, refs.length))
  const pool = resolveModePool(setup.modes, setup.random === true)
  return {
    words,
    batches: chunk(words, 10),
    pool,
    random: setup.random === true,
    roundIndex: -1,
    poolCursor: 0,
    lives: setup.lives === 'infinite' ? null : Number(setup.lives),
    score: 0,
    phase: 'idle',
    reason: null,
    round: null,
    draw: null,
    history: [],
  }
}

// A mode is eligible for a batch when its generator says the batch's faces can
// support it. The nine original modes have no generator and are eligible
// whenever the batch is non-empty.
function modeEligible(mode, faces) {
  const game = NEW_GAMES[mode]
  if (!game) return faces.length > 0
  return game.eligible ? game.eligible(faces).ok : true
}

function eligibleModes(pool, faces) {
  return pool.filter((mode) => modeEligible(mode, faces))
}

function newDraw(run, rng, faces) {
  const eligible = eligibleModes(run.pool, faces)
  const source = eligible.length > 0 ? eligible : run.pool
  const cards = []
  for (let i = 0; i < DRAW_CARDS; i += 1) cards.push(pick(source, rng))
  return { cards, revealed: -1 }
}

export function drawModeAt(run, index) {
  if (!run.draw || !Number.isInteger(index) || index < 0 || index >= run.draw.cards.length) {
    return null
  }
  return run.draw.cards[index]
}

function batchFaces(library, batch) {
  return batch.map((ref) => wordFace(ref, library?.entry ? library.entry(ref) : null))
}

// Advance to the next batch: a fresh 3×3 draw under 隨機模式, or the next
// eligible concrete mode in the ordered pool otherwise. Ineligible modes are
// skipped without looping forever.
export function beginNext(run, library, rng, timeLimit) {
  if (run.roundIndex >= run.batches.length) {
    run.phase = 'over'
    run.reason = 'cleared'
    run.round = null
    run.draw = null
    return
  }
  const batch = run.batches[run.roundIndex]
  const faces = batchFaces(library, batch)
  if (run.random) {
    run.phase = 'draw'
    run.draw = newDraw(run, rng, faces)
    run.round = null
    return
  }

  // Ordered pool: advance the cursor until an eligible mode is found.
  let tried = 0
  while (tried < run.pool.length) {
    const mode = run.pool[run.poolCursor % run.pool.length]
    run.poolCursor += 1
    tried += 1
    if (!modeEligible(mode, faces)) continue
    run.phase = 'round'
    run.draw = null
    run.round = createRound(mode, batch, library, run.words, rng, timeLimit)
    run.lastMode = mode
    return
  }

  // Every checked mode is ineligible for this batch: skip the batch safely.
  run.roundIndex += 1
  beginNext(run, library, rng, timeLimit)
}

export function createRound(mode, batch, library, poolRefs, rng, timeLimit) {
  const faces = batch.map((ref) => wordFace(ref, library?.entry ? library.entry(ref) : null))
  const poolFaces = (poolRefs ?? batch).map((ref) =>
    wordFace(ref, library?.entry ? library.entry(ref) : null),
  )
  const round = {
    mode,
    words: batch,
    faces,
    done: false,
    cleared: false,
    score: 0,
    streak: 0,
    // A time-limited round starts its countdown when play actually begins.
    // 記憶順序, 翻卡配對, and 消除下落 hold it through their untimed intros
    // (sequence show, opening peek, drop-in deal) and start it later.
    clock: { active: (timeLimit || 0) > 0 && !['memory', 'pairs', 'match3'].includes(mode), seconds: timeLimit || 0, key: 0 },
    clockSeconds: timeLimit || 0,
    baseClockSeconds: timeLimit || 0,
    flash: null,
    reveal: null,
    // The 10s hint clock lives at the command layer (see src/study/quiz/hint.js);
    // this default is only the empty round shape before the command syncs it.
    hint: { key: '', active: false, available: false, used: false },
    hintEffect: null,
    state: {},
  }
  if (CREATE[mode]) CREATE[mode](round, faces, poolFaces, rng)
  return round
}

// A no-change action result. `life` is a delta (0 or -1), `score` a delta,
// `clock` one of 'start' | 'stop' | null.
function noop() {
  return { life: 0, score: 0, clock: null, message: null }
}

// ---------- shared question helpers ----------

function mcQuestion(word, poolFaces, rng, promptFace, answerFace, choiceCount = 5) {
  const correct = faceOf(word, answerFace)
  const seen = new Set([correct])
  const distractors = []
  for (const f of shuffled(poolFaces, rng)) {
    if (sameRef(f.ref, word.ref)) continue
    const text = faceOf(f, answerFace)
    if (!text || seen.has(text)) continue
    seen.add(text)
    distractors.push(text)
    if (distractors.length >= choiceCount - 1) break
  }
  const choices = shuffled(
    [{ text: correct, correct: true }, ...distractors.map((text) => ({ text, correct: false }))],
    rng,
  )
  return {
    promptFace,
    answerFace,
    prompt: faceOf(word, promptFace),
    choices,
    correctIndex: choices.findIndex((choice) => choice.correct),
  }
}

function advanceQuestion(round, faces, poolFaces, rng, build) {
  round.state.index += 1
  round.flash = null
  round.reveal = null
  round.state.chosenIndex = null
  if (round.state.index >= faces.length) {
    round.done = true
    round.cleared = true
    round.state.phase = 'done'
    return true
  }
  round.state.question = build(round.state.index)
  round.state.phase = 'ask'
  return false
}

function correctEvent(round) {
  return { life: 0, score: 0, clock: 'stop', message: '正確' }
}

function wrongEvent(round, correctText) {
  round.reveal = { text: correctText }
  round.flash = 'wrong'
  round.state.phase = 'reveal'
  return { life: -1, score: 0, clock: 'stop', message: '錯誤' }
}

// ---------- 1) 選擇題 ----------

function createChoice(round, faces, poolFaces, rng) {
  round.state = { index: 0, phase: 'ask', question: null, chosenIndex: null }
  round.state.question = buildChoice(round, faces, poolFaces, rng, 0)
}

function buildChoice(round, faces, poolFaces, rng, index) {
  const word = faces[index]
  const promptFace = pick(FACES, rng)
  const answerFace = pick(FACES.filter((face) => face !== promptFace), rng)
  return mcQuestion(word, poolFaces, rng, promptFace, answerFace, 5)
}

function actChoice(round, action) {
  const state = round.state
  if (action.type === 'choose' && state.phase === 'ask') {
    const choice = state.question?.choices?.[action.index]
    if (!choice) return noop()
    state.chosenIndex = action.index
    if (choice.correct) {
      round.streak += 1
      round.flash = 'correct'
      state.phase = 'correct'
      return { life: 0, score: 10 + round.streak, clock: 'stop', message: '正確' }
    }
    round.streak = 0
    round.flash = 'wrong'
    state.phase = 'wrong'
    return { life: -1, score: 0, clock: 'stop', message: '錯誤' }
  }
  if (action.type === 'next' && (state.phase === 'correct' || state.phase === 'wrong')) {
    const done = advanceQuestion(round, round.faces, round.poolFaces, round.rng, (i) =>
      buildChoice(round, round.faces, round.poolFaces, round.rng, i),
    )
    return { life: 0, score: 0, clock: done ? 'stop' : 'start', message: null }
  }
  if (action.type === 'timeout' && state.phase === 'ask') {
    round.streak = 0
    round.flash = 'wrong'
    state.chosenIndex = null
    state.phase = 'wrong'
    return { life: -1, score: 0, clock: 'stop', message: '錯誤' }
  }
  return noop()
}

// The choice mode needs the full pool and rng stored on the round so `next` and
// `confirm` can rebuild questions without threading them again.
createChoice.usesPool = true

// ---------- 2) 翻卡配對 ----------

function createPairs(round, faces, _poolFaces, rng) {
  const cards = []
  for (let word = 0; word < faces.length; word += 1) {
    const twoFaces = shuffled([...FACES], rng).slice(0, 2)
    for (const face of twoFaces) cards.push({ word, face, open: false, matched: false, flash: false })
  }
  round.state = { cards: shuffled(cards, rng), open: [], locked: true, pending: null, done: false, peek: true }
}

function actPairs(round, action) {
  const state = round.state
  if (action.type === 'resolve') {
    // End the opening 3s all-face-up peek (the view staggered the deal, then
    // held it before dispatching resolve). Play — and the countdown — start
    // here, after the bar finishes and the cards flip back face-down.
    if (state.peek && state.locked) {
      state.peek = false
      state.locked = false
      return { life: 0, score: 0, clock: round.clockSeconds > 0 ? 'start' : null, message: null }
    }
    if (!state.locked || !state.pending) return noop()
    const [firstIndex, secondIndex] = state.pending
    const first = state.cards[firstIndex]
    const second = state.cards[secondIndex]
    if (first) {
      first.open = false
      first.flash = false
    }
    if (second) {
      second.open = false
      second.flash = false
    }
    state.open = []
    state.locked = false
    state.pending = null
    return noop()
  }
  if (action.type === 'tap') {
    if (state.locked) return noop()
    const card = state.cards[action.index]
    if (!card || card.matched || card.open) return noop()
    if (state.open.length === 0) {
      card.open = true
      state.open = [action.index]
      return noop()
    }
    if (state.open.length === 1) {
      const first = state.cards[state.open[0]]
      card.open = true
      state.open.push(action.index)
      if (first.word === card.word) {
        first.matched = true
        card.matched = true
        state.open = []
        round.streak += 1
        const done = state.cards.every((c) => c.matched)
        round.done = done
        round.cleared = done
        round.flash = 'correct'
        return { life: 0, score: 10, clock: 'reset', message: '配對成功' }
      }
      // Mismatch: keep both faces open and flash them so the player can see
      // what they picked. A later `resolve` (dispatched by the view after a
      // ~1s hold, longer than the flip) closes and clears the flash.
      first.flash = true
      card.flash = true
      const firstIndex = state.open[0]
      const secondIndex = state.open[1]
      state.locked = true
      state.pending = [firstIndex, secondIndex]
      round.streak = 0
      round.reveal = { pair: [firstIndex, secondIndex] }
      round.flash = 'wrong'
      return { life: -1, score: 0, clock: null, message: '配對失敗' }
    }
    return noop()
  }
  if (action.type === 'timeout') {
    round.done = true
    round.cleared = false
    return { life: 0, score: 0, clock: 'stop', message: '時間到' }
  }
  return noop()
}

// ---------- 3) 消除下落 ----------

const MATCH3_COLS = 5
const MATCH3_ROWS = 5
const MATCH3_WIN_CLEARS = 10

// A stable per-tile id lets the view keep surviving tiles' DOM nodes across a
// gravity refill and only animate the freshly dealt tiles (a new id = a new
// node = its drop-in animation runs again). It never affects game rules.
let match3CellKey = 0

function newMatch3Cell(faces, rng) {
  match3CellKey += 1
  return {
    word: Math.floor(rng01(rng) * faces.length),
    face: pick(FACES, rng),
    selected: false,
    cleared: false,
    fresh: true,
    key: match3CellKey,
  }
}

function stampMatch3Cell(word, rng) {
  match3CellKey += 1
  return { word, face: pick(FACES, rng), selected: false, cleared: false, fresh: true, key: match3CellKey }
}

function fillMatch3(faces, rng) {
  const cells = []
  for (let i = 0; i < MATCH3_COLS * MATCH3_ROWS; i += 1) cells.push(newMatch3Cell(faces, rng))
  return ensureMatch3Move(cells, faces, rng)
}

function indexToRowCol(index) {
  return { row: Math.floor(index / MATCH3_COLS), col: index % MATCH3_COLS }
}

function rowColToIndex(row, col) {
  return row * MATCH3_COLS + col
}

function orthogonalNeighbours(index) {
  const { row, col } = indexToRowCol(index)
  const out = []
  if (row > 0) out.push(rowColToIndex(row - 1, col))
  if (row < MATCH3_ROWS - 1) out.push(rowColToIndex(row + 1, col))
  if (col > 0) out.push(rowColToIndex(row, col - 1))
  if (col < MATCH3_COLS - 1) out.push(rowColToIndex(row, col + 1))
  return out
}

function adjacent(a, b) {
  const ar = indexToRowCol(a)
  const br = indexToRowCol(b)
  return Math.abs(ar.row - br.row) + Math.abs(ar.col - br.col) === 1
}

// Find an actual orthogonal, same-word connected component of size ≥3 (not just
// a straight row/col run). The returned order is a BFS order, so tapping the
// cells in that order is a valid hand path: every next cell is adjacent to some
// already-selected cell of the same word.
export function findMatch3Group(cells) {
  const seen = new Set()
  for (let start = 0; start < cells.length; start += 1) {
    const startCell = cells[start]
    if (!startCell || startCell.cleared || seen.has(start)) continue
    const word = startCell.word
    const group = []
    const stack = [start]
    seen.add(start)
    while (stack.length) {
      const cur = stack.pop()
      group.push(cur)
      for (const nb of orthogonalNeighbours(cur)) {
        const cell = cells[nb]
        if (!cell || cell.cleared || cell.word !== word || seen.has(nb)) continue
        seen.add(nb)
        stack.push(nb)
      }
    }
    if (group.length >= 3) return group
  }
  return null
}

// A legal move exists when there is at least one real connected 3+ group.
export function hasMatch3Move(cells) {
  return findMatch3Group(cells) !== null
}

// Guarantee at least one clearable group without disturbing the rest of the
// board. The first choice is a natural group; when none exists, the freshly
// dealt cells (survivors stay in place after gravity) are reshuffled for a
// bounded number of attempts. Only when that still fails is a 3-cell group
// planted at a random position with a random legal shape — never a fixed
// top-left triple the player could memorise.
const MATCH3_PLANT_SHAPES = [
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }], // horizontal
  [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }], // vertical
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }], // L
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }], // L mirrored
  [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }], // L
  [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }], // L mirrored
]

function plantMatch3Group(cells, faces, rng) {
  const word = Math.floor(rng01(rng) * faces.length)
  const shape = pick(MATCH3_PLANT_SHAPES, rng)
  const maxRow = MATCH3_ROWS - 1 - Math.max(...shape.map((cell) => cell.row))
  const maxCol = MATCH3_COLS - 1 - Math.max(...shape.map((cell) => cell.col))
  const anchorRow = maxRow > 0 ? Math.floor(rng01(rng) * (maxRow + 1)) : 0
  const anchorCol = maxCol > 0 ? Math.floor(rng01(rng) * (maxCol + 1)) : 0
  for (const offset of shape) {
    cells[rowColToIndex(anchorRow + offset.row, anchorCol + offset.col)] = stampMatch3Cell(word, rng)
  }
  return cells
}

export function ensureMatch3Move(cells, faces, rng) {
  if (findMatch3Group(cells)) return cells
  // Only the freshly dealt cells may be reshuffled; gravity survivors keep
  // their place. After a fill every cell is fresh, so the whole board is
  // redrawn here.
  const fresh = []
  cells.forEach((cell, index) => {
    if (cell && cell.fresh) fresh.push(index)
  })
  for (let attempt = 0; attempt < 80; attempt += 1) {
    for (const index of fresh) cells[index] = newMatch3Cell(faces, rng)
    if (findMatch3Group(cells)) return cells
  }
  return plantMatch3Group(cells, faces, rng)
}

function applyGravity(cells, rng, faces) {
  const next = new Array(cells.length).fill(null)
  for (let col = 0; col < MATCH3_COLS; col += 1) {
    const survivors = []
    for (let row = MATCH3_ROWS - 1; row >= 0; row -= 1) {
      const at = rowColToIndex(row, col)
      if (!cells[at].cleared) survivors.push(cells[at])
    }
    // Bottom rows get the survivors (bottom-up), top rows get new cards that
    // visibly fall into place in the view.
    for (let row = MATCH3_ROWS - 1; row >= 0; row -= 1) {
      const target = rowColToIndex(row, col)
      const source = survivors[MATCH3_ROWS - 1 - row]
      next[target] = source ? { ...source, selected: false, fresh: false } : newMatch3Cell(faces, rng)
    }
  }
  return ensureMatch3Move(next, faces, rng)
}

function createMatch3(round, faces, _poolFaces, rng) {
  round.state = {
    cells: fillMatch3(faces, rng),
    selected: [],
    score: 0,
    combo: 0,
    clearCount: 0,
    phase: 'drop',
    locked: true,
    pending: [],
  }
  // The opening drop-in is untimed: the countdown starts only after the view
  // resolves the deal and the tiles become tappable.
}

function actMatch3(round, action) {
  const state = round.state
  if (action.type === 'resolve') {
    if (state.phase === 'drop' && state.locked) {
      state.phase = 'play'
      state.locked = false
      return { life: 0, score: 0, clock: round.clockSeconds > 0 ? 'start' : null, message: null }
    }
    if (state.phase === 'clear' && state.locked) {
      for (const i of state.pending) state.cells[i].cleared = true
      state.cells = applyGravity(state.cells, round.rng, round.faces)
      state.pending = []
      state.locked = false
      state.phase = 'play'
      if (state.clearCount >= MATCH3_WIN_CLEARS) {
        round.done = true
        round.cleared = true
        return { life: 0, score: 0, clock: 'stop', message: '完成' }
      }
      return { life: 0, score: 0, clock: null, message: null }
    }
    return noop()
  }
  if (action.type === 'tap') {
    if (state.locked || state.phase !== 'play') return noop()
    const cells = state.cells
    const cell = cells[action.index]
    if (!cell || cell.cleared) return noop()

    const already = state.selected.indexOf(action.index) !== -1
    if (already) {
      cell.selected = false
      state.selected = state.selected.filter((i) => i !== action.index)
      return noop()
    }

    if (state.selected.length === 0) {
      cell.selected = true
      state.selected = [action.index]
      return noop()
    }

    const first = cells[state.selected[0]]
    const touchesChain = state.selected.some((i) => adjacent(i, action.index))
    const sameWord = cell.word === first.word

    if (sameWord && touchesChain) {
      // Legal extension: adjacent and the same word.
      cell.selected = true
      state.selected.push(action.index)
    } else if (!sameWord && !touchesChain) {
      // Changing to a different group's start: re-select, no life loss.
      for (const i of state.selected) cells[i].selected = false
      cell.selected = true
      state.selected = [action.index]
      return noop()
    } else {
      // Illegal extension: either a non-adjacent cell of the same word, or a
      // neighbouring different word. This is a clear invalid elimination.
      for (const i of state.selected) cells[i].selected = false
      cell.selected = false
      state.selected = []
      round.streak = 0
      state.combo = 0
      round.flash = 'wrong'
      return { life: -1, score: 0, clock: null, message: '無法消除' }
    }

    if (state.selected.length >= 3) {
      const count = state.selected.length
      state.combo += 1
      const combo = Math.max(1, state.combo)
      const gain = (count * 10 + (count >= 4 ? (count - 3) * 5 : 0)) * combo
      // A clear first pops the selected tiles while locked; the view dispatches
      // quiz.resolve after the pop, and only then does gravity refill the board.
      for (const i of state.selected) cells[i].selected = false
      state.pending = state.selected.slice()
      state.selected = []
      state.locked = true
      state.phase = 'clear'
      round.streak += 1
      state.clearCount += 1
      round.flash = 'correct'
      return { life: 0, score: gain, clock: 'reset', message: `消除 ${count} 個` }
    }
    return noop()
  }
  if (action.type === 'timeout') {
    round.done = true
    round.cleared = false
    round.flash = 'wrong'
    return { life: -1, score: 0, clock: 'stop', message: '時間到' }
  }
  return noop()
}

createMatch3.usesRng = true

// ---------- 4) 路徑連接 ----------

const CONNECT_COLS = 5
const CONNECT_ROWS = 8
const CONNECT_PAIRS = (CONNECT_COLS * CONNECT_ROWS) / 2

export { CONNECT_COLS, CONNECT_ROWS }

function buildConnectDeck(faces, rng) {
  const deck = []
  for (let pair = 0; pair < CONNECT_PAIRS; pair += 1) {
    const word = pair % faces.length
    const twoFaces = shuffled([...FACES], rng).slice(0, 2)
    for (const face of twoFaces) deck.push({ word, face })
  }
  return shuffled(deck, rng)
}

function connectNeighbours(index) {
  const row = Math.floor(index / CONNECT_COLS)
  const col = index % CONNECT_COLS
  const out = []
  if (row > 0) out.push(index - CONNECT_COLS)
  if (row < CONNECT_ROWS - 1) out.push(index + CONNECT_COLS)
  if (col > 0) out.push(index - 1)
  if (col < CONNECT_COLS - 1) out.push(index + 1)
  return out
}

// A valid connect path has at most 2 turns and travels only through cleared
// cells (or the two endpoints). BFS over (row, col, direction, turns) returns
// the full path as cell indices (endpoints included), or null when no path.
export function findConnectPath(cells, a, b) {
  const cols = CONNECT_COLS
  const rows = CONNECT_ROWS
  const ar = Math.floor(a / cols)
  const ac = a % cols
  const br = Math.floor(b / cols)
  const bc = b % cols
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]
  const queue = []
  const seen = new Set()
  const parent = new Map()
  for (let d = 0; d < dirs.length; d += 1) {
    const key = `${ar},${ac},${d},0`
    seen.add(key)
    parent.set(key, { r: ar, c: ac, d, turns: 0, from: null })
    queue.push({ r: ar, c: ac, d, turns: 0, key })
  }
  while (queue.length) {
    const cur = queue.shift()
    for (let d = 0; d < dirs.length; d += 1) {
      const turns = cur.turns + (d === cur.d ? 0 : 1)
      if (turns > 2) continue
      const nr = cur.r + dirs[d][0]
      const nc = cur.c + dirs[d][1]
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      const at = nr * cols + nc
      const isEnd = at === b
      if (!isEnd && !cells[at].cleared) continue
      const key = `${nr},${nc},${d},${turns}`
      if (seen.has(key)) continue
      seen.add(key)
      parent.set(key, { r: nr, c: nc, d, turns, from: cur.key })
      if (isEnd) {
        // Reconstruct (row, col) from b back to a, endpoints included once.
        const cellsPath = [{ r: nr, c: nc }]
        let node = parent.get(key)
        while (node && node.from) {
          node = parent.get(node.from)
          cellsPath.unshift({ r: node.r, c: node.c })
        }
        return cellsPath.map(({ r, c }) => r * cols + c)
      }
      queue.push({ r: nr, c: nc, d, turns, key })
    }
  }
  return null
}

export function hasConnectMove(cells) {
  const alive = []
  cells.forEach((cell, index) => {
    if (!cell.cleared) alive.push(index)
  })
  const byWord = new Map()
  for (const index of alive) {
    const list = byWord.get(cells[index].word) ?? []
    list.push(index)
    byWord.set(cells[index].word, list)
  }
  for (const list of byWord.values()) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        if (findConnectPath(cells, list[i], list[j])) return true
      }
    }
  }
  return false
}

// Make two cards of one word orthogonally adjacent by swapping one of them
// with a neighbouring card. Swapping keeps every word count even, so no lone
// card is left behind. Returns true when it found a swap.
function forceConnectMove(cells, rng) {
  const alive = []
  cells.forEach((cell, index) => {
    if (!cell.cleared) alive.push(index)
  })
  const byWord = new Map()
  for (const index of alive) {
    const list = byWord.get(cells[index].word) ?? []
    list.push(index)
    byWord.set(cells[index].word, list)
  }
  for (const list of byWord.values()) {
    if (list.length < 2) continue
    const a = list[0]
    const b = list[1]
    for (const target of connectNeighbours(a)) {
      if (target === b) return true
      if (!cells[target] || cells[target].cleared) continue
      const cardAtTarget = cells[target]
      cells[target] = cells[b]
      cells[b] = cardAtTarget
      return true
    }
  }
  return false
}

// Keep a playable board: when no legal connection exists, first shuffle the
// non-cleared cards (cleared holes stay), then force an adjacent pair. The
// rare no-swap case (an isolated last card) is left alone and documented.
function ensureConnectMove(cells, rng) {
  if (hasConnectMove(cells)) return cells
  const positions = []
  cells.forEach((cell, index) => {
    if (!cell.cleared) positions.push(index)
  })
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const cards = positions.map((index) => cells[index])
    const next = shuffled(cards, rng)
    positions.forEach((index, at) => {
      cells[index] = { ...next[at], cleared: false, selected: false, flash: false }
    })
    if (hasConnectMove(cells)) return cells
  }
  forceConnectMove(cells, rng)
  return cells
}

function createConnect(round, faces, _poolFaces, rng) {
  round.state = {
    cells: buildConnectDeck(faces, rng).map((card) => ({
      ...card,
      cleared: false,
      selected: false,
      flash: false,
    })),
    selected: -1,
    locked: false,
    pending: null,
    path: null,
  }
  ensureConnectMove(round.state.cells, rng)
}

createConnect.usesRng = true

function actConnect(round, action) {
  const state = round.state
  if (action.type === 'resolve') {
    if (!state.locked || !state.pending) return noop()
    const [firstIndex, secondIndex] = state.pending
    const cells = state.cells
    if (cells[firstIndex]) {
      cells[firstIndex].cleared = true
      cells[firstIndex].selected = false
      cells[firstIndex].flash = false
    }
    if (cells[secondIndex]) {
      cells[secondIndex].cleared = true
      cells[secondIndex].selected = false
      cells[secondIndex].flash = false
    }
    state.selected = -1
    state.locked = false
    state.pending = null
    state.path = null
    const done = cells.every((c) => c.cleared)
    round.done = done
    round.cleared = done
    if (!done) ensureConnectMove(cells, round.rng)
    return noop()
  }
  if (action.type === 'tap') {
    if (state.locked) return noop()
    const cells = state.cells
    const cell = cells[action.index]
    if (!cell || cell.cleared) return noop()
    if (state.selected === -1) {
      cell.selected = true
      state.selected = action.index
      return noop()
    }
    if (state.selected === action.index) {
      cell.selected = false
      state.selected = -1
      return noop()
    }
    const firstIndex = state.selected
    const first = cells[firstIndex]
    const path = first.word === cell.word ? findConnectPath(cells, firstIndex, action.index) : null
    if (path) {
      // Reveal the path first; the view holds it ~0.7s and then dispatches
      // `quiz.resolve`, which clears the two cards. The score lands now.
      first.selected = false
      cell.selected = false
      state.selected = -1
      state.locked = true
      state.pending = [firstIndex, action.index]
      state.path = path
      round.streak += 1
      round.flash = 'correct'
      return { life: 0, score: 10, clock: 'reset', message: '連線成功' }
    }
    first.selected = false
    first.flash = true
    cell.flash = true
    state.selected = -1
    round.streak = 0
    round.reveal = { pair: [firstIndex, action.index] }
    round.flash = 'wrong'
    return { life: -1, score: 0, clock: null, message: '無法連線' }
  }
  if (action.type === 'timeout') {
    round.done = true
    round.cleared = false
    return { life: 0, score: 0, clock: 'stop', message: '時間到' }
  }
  return noop()
}

// ---------- 5) Boss 戰 ----------

function createBoss(round, faces, poolFaces, rng) {
  round.state = {
    hp: Math.max(1, faces.length),
    maxHp: Math.max(1, faces.length),
    index: 0,
    phase: 'ask',
    question: null,
    modifier: null,
    chosenIndex: null,
  }
  round.state.question = buildBoss(round, faces, poolFaces, rng, 0)
  round.state.modifier = bossModifier(round.state.index)
  setBossClock(round)
}

function bossModifier(index) {
  // Every third question gets a shorter timer; the command reads `clockSeconds`
  // when it starts the clock. Kept fair: it only shrinks the limit, it never
  // changes the word or the choices.
  return index % 3 === 2 ? 'short' : null
}

function setBossClock(round) {
  const base = round.baseClockSeconds || 0
  if (base <= 0) {
    round.clockSeconds = 0
    return
  }
  round.clockSeconds = round.state.modifier === 'short' ? Math.max(1, base - 1) : base
}

function buildBoss(round, faces, poolFaces, rng, index) {
  const word = faces[index]
  const promptFace = pick(FACES, rng)
  const answerFace = pick(FACES.filter((face) => face !== promptFace), rng)
  return mcQuestion(word, poolFaces, rng, promptFace, answerFace, 5)
}

function actBoss(round, action) {
  const state = round.state
  if (action.type === 'choose' && state.phase === 'ask') {
    const choice = state.question?.choices?.[action.index]
    if (!choice) return noop()
    state.chosenIndex = action.index
    if (choice.correct) {
      round.streak += 1
      const crit = round.streak >= 3 ? 2 : 1
      state.hp = Math.max(0, state.hp - crit)
      round.flash = 'correct'
      state.phase = 'correct'
      if (state.hp <= 0) {
        round.done = true
        round.cleared = true
        state.phase = 'done'
        return { life: 0, score: 30 * crit, clock: 'stop', message: 'Boss 擊敗' }
      }
      return { life: 0, score: 20 * crit, clock: 'stop', message: `造成 ${crit} 點傷害` }
    }
    round.streak = 0
    round.flash = 'wrong'
    state.phase = 'wrong'
    return { life: -1, score: 0, clock: 'stop', message: '錯誤' }
  }
  if (action.type === 'next' && (state.phase === 'correct' || state.phase === 'wrong')) {
    if (state.index + 1 >= round.faces.length) {
      round.done = true
      round.cleared = false
      state.phase = 'done'
      return { life: 0, score: 0, clock: 'stop', message: 'Boss 尚未擊敗' }
    }
    state.index += 1
    state.chosenIndex = null
    state.modifier = bossModifier(state.index)
    setBossClock(round)
    state.question = buildBoss(round, round.faces, round.poolFaces, round.rng, state.index)
    state.phase = 'ask'
    return { life: 0, score: 0, clock: 'start', message: null }
  }
  if (action.type === 'timeout' && state.phase === 'ask') {
    round.streak = 0
    round.flash = 'wrong'
    state.chosenIndex = null
    state.phase = 'wrong'
    return { life: -1, score: 0, clock: 'stop', message: '錯誤' }
  }
  return noop()
}

createBoss.usesPool = true

// ---------- 6) 記憶順序 ----------

// Each group is three words. The round opens with a single face-down pile at
// the bottom; one tap deals the three cards into three slots one by one, a 2s
// countdown holds them readable, then the player places the three 中文 meanings
// into the slots. All three are graded together when the third slot is filled.

const MEMORY_OPTION_COUNT = 6

function memoryGroups(faces, rng) {
  return chunk(shuffled(faces.map((_face, at) => at), rng), 3)
}

function startMemoryGroup(round, faces, rng) {
  const group = round.state.groups[round.state.groupIndex]
  round.state.slots = group.map((word) => ({
    word,
    face: pick(['jp', 'kana'], rng),
    placed: -1,
    correct: null,
  }))
  const correctTexts = round.state.slots.map((slot) => faceOf(faces[slot.word], 'zh'))
  const seen = new Set(correctTexts)
  const distractors = []
  for (const other of shuffled(round.poolFaces, rng)) {
    const text = faceOf(other, 'zh')
    if (!text || seen.has(text)) continue
    seen.add(text)
    distractors.push(text)
    if (distractors.length >= MEMORY_OPTION_COUNT - correctTexts.length) break
  }
  round.state.choices = shuffled(
    [
      ...correctTexts.map((text) => ({ text, correct: true, used: false })),
      ...distractors.map((text) => ({ text, correct: false, used: false })),
    ],
    rng,
  )
  round.state.phase = 'stack'
  round.reveal = null
  round.flash = null
}

function createMemory(round, faces, _poolFaces, rng) {
  round.state = {
    groups: memoryGroups(faces, rng),
    groupIndex: 0,
    phase: 'stack',
    slots: [],
    choices: [],
  }
  startMemoryGroup(round, faces, rng)
}

// Grade the three slots together. The view flips the slot cards on `check`; the
// life/score deltas land on this single submit, not per placement.
function gradeMemoryGroup(round, timeout = false) {
  const state = round.state
  let allCorrect = true
  for (const slot of state.slots) {
    const choice = state.choices[slot.placed]
    const answer = faceOf(round.faces[slot.word], 'zh')
    slot.correct = Boolean(choice) && choice.text === answer
    if (!slot.correct) allCorrect = false
  }
  state.phase = 'check'
  if (allCorrect) {
    round.streak += 1
    round.flash = 'correct'
    return { life: 0, score: 30 + round.streak * 2, clock: 'stop', message: '記憶正確' }
  }
  round.streak = 0
  round.flash = 'wrong'
  return { life: -1, score: 0, clock: 'stop', message: timeout ? '時間到' : '記憶錯誤' }
}

function afterMemoryCheck(round) {
  const state = round.state
  const allCorrect = state.slots.every((slot) => slot.correct)
  if (allCorrect) {
    if (state.groupIndex + 1 >= state.groups.length) {
      round.done = true
      round.cleared = true
      state.phase = 'done'
      return { life: 0, score: 0, clock: 'stop', message: '記憶完成' }
    }
    state.groupIndex += 1
    startMemoryGroup(round, round.faces, round.rng)
    return { life: 0, score: 0, clock: null, message: '本組完成' }
  }
  // Retry the same group: clear the placements and re-enable the options. The
  // player just saw which slots were correct, so the words need no re-deal.
  for (const slot of state.slots) {
    slot.placed = -1
    slot.correct = null
  }
  for (const choice of state.choices) choice.used = false
  state.phase = 'ask'
  round.flash = null
  round.reveal = null
  return { life: 0, score: 0, clock: round.clockSeconds > 0 ? 'start' : null, message: '再試一次' }
}

function actMemory(round, action) {
  const state = round.state
  if (action.type === 'tap' && state.phase === 'stack') {
    state.phase = 'deal'
    round.flash = null
    round.reveal = null
    return { life: 0, score: 0, clock: null, message: null }
  }
  if (action.type === 'next' && state.phase === 'deal') {
    state.phase = 'countdown'
    return { life: 0, score: 0, clock: null, message: null }
  }
  if (action.type === 'next' && state.phase === 'countdown') {
    state.phase = 'ask'
    round.flash = null
    round.reveal = null
    return { life: 0, score: 0, clock: round.clockSeconds > 0 ? 'start' : null, message: null }
  }
  if (action.type === 'choose' && state.phase === 'ask') {
    const choice = state.choices[action.index]
    if (!choice || choice.used) return noop()
    const slotIndex = state.slots.findIndex((slot) => slot.placed < 0)
    if (slotIndex === -1) return noop()
    choice.used = true
    state.slots[slotIndex].placed = action.index
    // The first two placements only fill slots; the third placement submits.
    if (slotIndex < state.slots.length - 1) {
      return { life: 0, score: 0, clock: null, message: null }
    }
    return gradeMemoryGroup(round)
  }
  if (action.type === 'confirm' && state.phase === 'check') {
    return afterMemoryCheck(round)
  }
  if (action.type === 'timeout' && state.phase === 'ask') {
    return gradeMemoryGroup(round, true)
  }
  return noop()
}

createMemory.usesPool = true
createMemory.usesRng = true

// ---------- 7) 拼字 / 打亂重組 ----------

const DISTRACTOR_KANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねの'

function distractorFor(target, rng) {
  for (let i = 0; i < 40; i += 1) {
    const ch = DISTRACTOR_KANA[Math.floor(rng01(rng) * DISTRACTOR_KANA.length)]
    if (!target.includes(ch)) return ch
  }
  return 'あ'
}

function buildSpellTiles(word, rng) {
  const target = Array.from(word.kana)
  // Eight tiles total: the word's own kana, plus random distractor kana to
  // reach eight when the word is shorter. A word longer than eight keeps all
  // of its characters and gains no distractors.
  const distractors = []
  for (let i = target.length; i < 8; i += 1) distractors.push(distractorFor(target, rng))
  return shuffled(
    [
      ...target.map((ch, at) => ({ ch, id: `${ch}-${at}` })),
      ...distractors.map((ch, at) => ({ ch, id: `${ch}-x-${at}` })),
    ],
    rng,
  )
}

function createSpell(round, faces, _poolFaces, rng) {
  round.state = { index: 0, phase: 'ask', tiles: [], placed: [], target: [] }
  buildSpellQuestion(round, faces, rng, 0)
}

function buildSpellQuestion(round, faces, rng, index) {
  const word = faces[index]
  round.state.target = Array.from(word.kana)
  round.state.tiles = buildSpellTiles(word, rng)
  round.state.placed = []
  round.state.prompt = word.zh || word.jp
  round.state.promptFace = word.zh ? 'zh' : 'jp'
  round.state.phase = 'ask'
}

function placedMatches(state) {
  return (
    state.placed.length === state.target.length &&
    state.placed.every((tile, at) => tile.ch === state.target[at])
  )
}

function actSpell(round, action) {
  const state = round.state
  if (action.type === 'tap' && state.phase === 'ask') {
    // Indices past the tile tray address the placed word: tapping a placed tile
    // takes it back, which is the undo/rearrange gesture.
    if (action.index >= state.tiles.length) {
      const placedAt = action.index - state.tiles.length
      const tile = state.placed[placedAt]
      if (tile) {
        tile.used = false
        state.placed.splice(placedAt, 1)
      }
      return noop()
    }
    const tile = state.tiles[action.index]
    if (!tile || tile.used) return noop()
    tile.used = true
    state.placed.push(tile)
    if (state.placed.length < state.target.length) return noop()
    if (placedMatches(state)) {
      round.streak += 1
      round.flash = 'correct'
      state.phase = 'correct'
      return { life: 0, score: 10 + round.streak, clock: 'stop', message: '拼字正確' }
    }
    round.streak = 0
    round.reveal = { text: state.target.join('') }
    round.flash = 'wrong'
    state.phase = 'reveal'
    return { life: -1, score: 0, clock: 'stop', message: '拼字錯誤' }
  }
  if (action.type === 'tap' && state.phase === 'reveal') {
    // Tapping a placed tile in reveal is ignored; the 確定 button advances.
    return noop()
  }
  if (action.type === 'next' && state.phase === 'correct') {
    const done = state.index + 1 >= round.faces.length
    if (done) {
      round.done = true
      round.cleared = true
      state.phase = 'done'
      return { life: 0, score: 0, clock: 'stop', message: null }
    }
    state.index += 1
    buildSpellQuestion(round, round.faces, round.rng, state.index)
    return { life: 0, score: 0, clock: 'start', message: null }
  }
  if (action.type === 'confirm' && state.phase === 'reveal') {
    const done = state.index + 1 >= round.faces.length
    if (done) {
      round.done = true
      round.cleared = true
      state.phase = 'done'
      return { life: 0, score: 0, clock: 'stop', message: null }
    }
    state.index += 1
    buildSpellQuestion(round, round.faces, round.rng, state.index)
    return { life: 0, score: 0, clock: 'start', message: null }
  }
  if (action.type === 'timeout' && state.phase === 'ask') {
    round.streak = 0
    round.reveal = { text: state.target.join('') }
    round.flash = 'wrong'
    state.phase = 'reveal'
    return { life: -1, score: 0, clock: 'stop', message: '時間到' }
  }
  return noop()
}

createSpell.usesRng = true

// ---------- 8) 快速反應 ----------

const REACTION_CARDS = 6

function buildReaction(round, rng) {
  const state = round.state
  const targetWord = state.remaining[0]
  // The prompt and the answers must never be the same language: if the prompt
  // is 中文, the options are 日語/平假名, and vice versa.
  const promptFace = pick(FACES, rng)
  const answerFace = pick(FACES.filter((face) => face !== promptFace), rng)
  const targetText = faceOf(round.faces[targetWord], answerFace)
  const seen = new Set([targetText])
  const cards = [{ word: targetWord, face: answerFace, hit: false }]
  const others = shuffled(
    round.faces.map((_face, at) => at).filter((at) => at !== targetWord),
    rng,
  )
  for (const otherWord of others) {
    const text = faceOf(round.faces[otherWord], answerFace)
    // Skip duplicate option text so only one card can be the correct one.
    if (!text || seen.has(text)) continue
    seen.add(text)
    cards.push({ word: otherWord, face: answerFace, hit: false })
    if (cards.length >= REACTION_CARDS) break
  }
  state.target = { word: targetWord, face: promptFace }
  state.cards = shuffled(cards, rng)
  state.flash = -1
  round.flash = null
  round.reveal = null
}

function createReaction(round, faces, _poolFaces, rng) {
  round.state = {
    remaining: shuffled(faces.map((_f, at) => at), rng),
    hit: 0,
    total: faces.length,
    target: null,
    cards: [],
    flash: -1,
  }
  buildReaction(round, rng)
}

function actReaction(round, action) {
  const state = round.state
  if (action.type === 'tap') {
    const card = state.cards[action.index]
    if (!card) return noop()
    if (card.word === state.target.word) {
      state.hit += 1
      state.remaining = state.remaining.filter((w) => w !== state.target.word)
      round.streak += 1
      round.flash = 'correct'
      if (state.hit >= state.total) {
        round.done = true
        round.cleared = true
        state.phase = 'done'
        return { life: 0, score: 15 + round.streak, clock: 'stop', message: '全部命中' }
      }
      buildReaction(round, round.rng)
      return { life: 0, score: 10 + round.streak, clock: 'reset', message: '命中' }
    }
    round.streak = 0
    state.flash = action.index
    round.flash = 'wrong'
    // Keep the same board so the wrong judgement is stable; the red frame
    // clears when the player finally hits the correct card and the board
    // rebuilds for the next question.
    return { life: -1, score: 0, clock: null, message: '打錯' }
  }
  if (action.type === 'timeout') {
    if (state.hit >= state.total) {
      round.done = true
      round.cleared = true
      return { life: 0, score: 0, clock: 'stop', message: null }
    }
    round.done = true
    round.cleared = false
    round.flash = 'wrong'
    return { life: -1, score: 0, clock: 'stop', message: '時間到' }
  }
  return noop()
}

createReaction.usesRng = true

// ---------- 10) 雙欄對決 ----------

function createColumns(round, faces, _poolFaces, rng) {
  const left = []
  const right = []
  for (let word = 0; word < faces.length; word += 1) {
    const leftFace = pick(['zh', 'kana'], rng)
    const rightFace = pick(['jp', 'kana'], rng)
    left.push({ word, face: leftFace, matched: false, flash: false })
    right.push({ word, face: rightFace, matched: false, flash: false })
  }
  round.state = {
    left: shuffled(left, rng),
    right: shuffled(right, rng),
    leftSelected: -1,
    streak: 0,
  }
}

function actColumns(round, action) {
  const state = round.state
  const size = state.left.length
  if (action.type === 'tap') {
    if (action.index < size) {
      const card = state.left[action.index]
      if (!card || card.matched) return noop()
      state.leftSelected = state.leftSelected === action.index ? -1 : action.index
      return noop()
    }
    const rightIndex = action.index - size
    const rightCard = state.right[rightIndex]
    if (!rightCard || rightCard.matched) return noop()
    if (state.leftSelected === -1) return noop()
    const leftCard = state.left[state.leftSelected]
    const leftIndex = state.leftSelected
    if (leftCard.word === rightCard.word) {
      leftCard.matched = true
      rightCard.matched = true
      state.leftSelected = -1
      round.streak += 1
      round.flash = 'correct'
      const done = state.left.every((c) => c.matched) && state.right.every((c) => c.matched)
      round.done = done
      round.cleared = done
      return { life: 0, score: 10 + round.streak, clock: 'reset', message: '配對成功' }
    }
    leftCard.flash = true
    rightCard.flash = true
    round.reveal = { pair: [leftIndex, rightIndex + size] }
    round.streak = 0
    round.flash = 'wrong'
    state.leftSelected = -1
    return { life: -1, score: 0, clock: null, message: '配對失敗' }
  }
  if (action.type === 'timeout') {
    round.done = true
    round.cleared = false
    return { life: 0, score: 0, clock: 'stop', message: '時間到' }
  }
  return noop()
}

// ---------- dispatch ----------

const CREATE = {
  choice: createChoice,
  pairs: createPairs,
  match3: createMatch3,
  connect: createConnect,
  boss: createBoss,
  memory: createMemory,
  spell: createSpell,
  reaction: createReaction,
  columns: createColumns,
}

const ACT = {
  choice: actChoice,
  pairs: actPairs,
  match3: actMatch3,
  connect: actConnect,
  boss: actBoss,
  memory: actMemory,
  spell: actSpell,
  reaction: actReaction,
  columns: actColumns,
}

// Merge the ten newer, per-module games into the same dispatch tables.
for (const [id, game] of Object.entries(NEW_GAMES)) {
  CREATE[id] = game.create
  ACT[id] = game.act
  if (game.usesPool) CREATE[id].usesPool = true
  if (game.usesRng) CREATE[id].usesRng = true
}

// Round builders that need the full pool or the rng re-attach them here so
// `next` / `confirm` / gravity refills can regenerate deterministically.
for (const mode of Object.keys(CREATE)) {
  if (CREATE[mode].usesPool) {
    const original = CREATE[mode]
    CREATE[mode] = (round, faces, poolFaces, rng) => {
      round.poolFaces = poolFaces
      round.rng = rng
      original(round, faces, poolFaces, rng)
    }
  }
  if (CREATE[mode].usesRng) {
    const original = CREATE[mode]
    CREATE[mode] = (round, faces, poolFaces, rng) => {
      round.rng = rng
      original(round, faces, poolFaces, rng)
    }
  }
}

// Apply one user action to the active round. Mutates the round and returns a
// small event: `life` and `score` are deltas, `clock` tells the command how to
// move the countdown. `done` / `cleared` / `flash` / `reveal` are read off the
// round itself afterwards.
export function act(round, action, ctx = {}) {
  const mode = round.mode
  if (!CONCRETE_MODES.includes(mode) || !ACT[mode]) return noop()
  if (typeof action?.type !== 'string') return noop()
  return ACT[mode](round, action, ctx)
}
