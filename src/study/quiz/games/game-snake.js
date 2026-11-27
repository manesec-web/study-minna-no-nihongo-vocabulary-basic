// 單字貪食蛇 (snake): a fine grid of many small cells (COLS × ROWS), mostly
// empty, where each cell holds at most one hiragana. The current word's kana
// are laid along a reserved self-avoiding walk from the start, so a winning
// route always exists; wrong kana are scattered off that walk and can never
// block it. The snake eats the current word's kana in order.
//
//   - a CORRECT kana stays gone (「吃掉了就不需要出現」) and the snake grows;
//   - a WRONG kana is eaten, the snake shrinks by one, and the kana reappears
//     after ~1s in a random empty cell: the engine only queues it on
//     `state.respawn` and flags the event, the view dispatches the late
//     `respawn` action (src/study/quiz/respawn-timer.js), never the .vue;
//   - the wall wraps around: leaving through the right edge re-enters from the
//     left, and the same on the other three edges; only the snake's own body
//     costs a life and resets the snake (the board keeps its progress);
//   - direction input is queued so a fast reversal cannot self-collide.
import { rng01, shuffled } from './shared.js'

export const usesPool = false
export const usesRng = true

export const COLS = 13
export const ROWS = 17
export const START_LENGTH = 3
// How many wrong kana are scattered per level (the walk itself stays empty).
const DISTRACTOR_MIN = 22
const DISTRACTOR_MAX = 28

const KANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'

const DIRVEC = { up: { dr: -1, dc: 0 }, down: { dr: 1, dc: 0 }, left: { dr: 0, dc: -1 }, right: { dr: 0, dc: 1 } }
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' }

function eligibleWords(faces) {
  return faces.filter((f) => f.zh && f.kana && Array.from(f.kana).length >= 2 && Array.from(f.kana).length <= 6)
}

export function eligible(faces) {
  if (eligibleWords(faces).length < 1) {
    return { ok: false, reason: '需要至少 1 個讀音 2–6 假名且有中文的單詞' }
  }
  return { ok: true, reason: null }
}

function cellIndex(row, col) {
  return row * COLS + col
}

function startCells() {
  // The head sits at column START_LENGTH on the third row, body to its left,
  // facing right. The rows above stay clear so the first turn is always safe.
  const row = 2
  const head = cellIndex(row, START_LENGTH)
  return Array.from({ length: START_LENGTH }, (_v, i) => head - i)
}

function resetSnake(state) {
  state.snake = startCells()
  state.dir = 'right'
  state.pendingDir = null
}

// A kana of the current word. `target` tells the rule from the distractors;
// the walk order of the target cells is kept in `state.targets`.
function currentChars(state) {
  return Array.from(state.queue[state.position].kana)
}

function markFood(state) {
  const expected = currentChars(state)[state.targetIndex]
  state.foodAt = null
  if (expected == null) return
  const at = state.targets.find((index) => state.grid[index]?.char === expected)
  state.foodAt = at ?? null
}

// Drop target cells the word no longer needs (a duplicated kana satisfied by
// another cell), keeping the rest in walk order.
function pruneTargets(state) {
  const needed = currentChars(state).slice(state.targetIndex)
  const kept = []
  for (const ch of needed) {
    const at = state.targets.find((index) => !kept.includes(index) && state.grid[index]?.char === ch)
    if (at != null) kept.push(at)
  }
  for (const index of state.targets) {
    if (!kept.includes(index)) state.grid[index] = null
  }
  state.targets = kept
}

function buildLevel(state, rng) {
  const chars = currentChars(state)
  state.grid = new Array(COLS * ROWS).fill(null)
  state.targets = []
  state.targetIndex = 0
  state.respawn = []
  resetSnake(state)

  // The reserved walk: head → each kana in turn, two or three cells apart,
  // turning down one row at a wall and drifting down a row now and then. It
  // only ever moves down or sideways, so it never revisits a cell.
  const reserved = new Set(state.snake)
  const route = []
  let row = 2
  let col = START_LENGTH
  let dx = 1
  const step = () => {
    if (col + dx < 0 || col + dx >= COLS) {
      // A wall turn steps down one row and reverses. With at most six kana the
      // walk never reaches the bottom row; the clamp is only a safety net.
      row = Math.min(row + 1, ROWS - 1)
      dx = -dx
    } else {
      col += dx
    }
    reserved.add(cellIndex(row, col))
    route.push(cellIndex(row, col))
  }
  chars.forEach((ch, k) => {
    const steps = 2 + Math.floor(rng01(rng) * 2)
    for (let s = 0; s < steps; s += 1) step()
    state.grid[cellIndex(row, col)] = { char: ch, target: true }
    state.targets.push(cellIndex(row, col))
    if (k < chars.length - 1 && rng01(rng) < 0.6 && row < ROWS - 2) {
      row += 1
      reserved.add(cellIndex(row, col))
      route.push(cellIndex(row, col))
    }
  })
  state.route = route

  // Wrong kana: never a kana of the current word, never on the walk.
  const wordChars = new Set(chars)
  const pool = Array.from(KANA).filter((ch) => !wordChars.has(ch))
  const count = DISTRACTOR_MIN + Math.floor(rng01(rng) * (DISTRACTOR_MAX - DISTRACTOR_MIN + 1))
  let placed = 0
  for (let tries = 0; tries < 600 && placed < count; tries += 1) {
    const at = Math.floor(rng01(rng) * state.grid.length)
    if (state.grid[at] || reserved.has(at)) continue
    state.grid[at] = { char: pool[Math.floor(rng01(rng) * pool.length)], target: false }
    placed += 1
  }
  markFood(state)
}

export function create(round, faces, _poolFaces, rng) {
  round.state = {
    queue: shuffled(eligibleWords(faces), rng),
    position: 0,
    grid: [],
    targets: [],
    route: [],
    snake: [],
    dir: 'right',
    pendingDir: null,
    targetIndex: 0,
    foodAt: null,
    respawn: [],
    phase: 'play',
  }
  buildLevel(round.state, rng)
}

function noop() {
  return { life: 0, score: 0, clock: null, message: null }
}

export function act(round, action) {
  const state = round.state
  if (state.phase !== 'play') return noop()

  if (action.type === 'dir' && typeof action.value === 'string' && DIRVEC[action.value]) {
    const effective = state.pendingDir ?? state.dir
    if (OPPOSITE[action.value] !== effective) state.pendingDir = action.value
    return noop()
  }

  if (action.type === 'respawn') {
    // One queued wrong kana returns in a random empty cell (never under the
    // snake, never on a cell that already holds a kana).
    const ch = state.respawn.shift()
    if (ch == null) return noop()
    const empty = []
    for (let at = 0; at < state.grid.length; at += 1) {
      if (state.grid[at] == null && !state.snake.includes(at)) empty.push(at)
    }
    if (empty.length === 0) {
      state.respawn.unshift(ch)
      return noop()
    }
    const at = empty[Math.floor(rng01(round.rng) * empty.length)]
    state.grid[at] = { char: ch, target: false }
    return noop()
  }

  if (action.type === 'tick') {
    if (state.pendingDir) {
      state.dir = state.pendingDir
      state.pendingDir = null
    }
    const head = state.snake[0]
    const vec = DIRVEC[state.dir]
    const row = Math.floor(head / COLS)
    const col = head % COLS
    // Wrap through the walls: the snake leaves one edge and re-enters from the
    // opposite edge, so only colliding with its own body counts as a crash.
    const nr = (row + vec.dr + ROWS) % ROWS
    const nc = (col + vec.dc + COLS) % COLS
    const next = cellIndex(nr, nc)
    if (state.snake.includes(next)) {
      round.streak = 0
      resetSnake(state)
      return { life: -1, score: 0, clock: null, message: '撞到自己' }
    }

    const cell = state.grid[next]
    const chars = currentChars(state)
    const expected = chars[state.targetIndex]

    if (cell && cell.target && cell.char === expected) {
      // Correct: gone for good, the snake grows.
      state.grid[next] = null
      state.snake.unshift(next)
      state.targets = state.targets.filter((index) => index !== next)
      state.targetIndex += 1
      if (state.targetIndex >= chars.length) {
        state.position += 1
        if (state.position >= state.queue.length) {
          round.done = true
          round.cleared = true
          state.phase = 'done'
          return { life: 0, score: 25 + round.streak * 5, clock: 'stop', message: '吃完' }
        }
        round.streak += 1
        buildLevel(state, round.rng)
        return { life: 0, score: 10 + round.streak * 5, clock: 'reset', message: '吃完整詞' }
      }
      pruneTargets(state)
      markFood(state)
      round.streak += 1
      return { life: 0, score: 5, clock: null, message: '吃一字' }
    }

    if (cell) {
      // Wrong kana: eaten, the snake shrinks, and the kana comes back later.
      state.grid[next] = null
      state.snake.unshift(next)
      state.snake.pop()
      if (state.snake.length > 1) state.snake.pop()
      state.respawn.push(cell.char)
      round.streak = 0
      return { life: 0, score: 0, clock: null, message: '吃到干擾字', respawn: true }
    }

    // Empty cell: plain move.
    state.snake.unshift(next)
    state.snake.pop()
    return noop()
  }

  if (action.type === 'timeout') {
    round.done = true
    round.cleared = false
    state.phase = 'done'
    return { life: -1, score: 0, clock: 'stop', message: '時間到' }
  }
  return noop()
}
