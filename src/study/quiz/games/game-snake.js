// 單字貪食蛇 (snake): a bounded grid; the snake eats the current word's kana in
// order while avoiding distractor kana, the wall, and its own body. Direction
// input is queued to prevent the classic fast-reversal self-collision.
import { rng01, shuffled } from './shared.js'

export const usesPool = false
export const usesRng = true

const SIZE = 8
const KANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'

function eligibleWords(faces) {
  return faces.filter((f) => f.zh && f.kana && Array.from(f.kana).length >= 2 && Array.from(f.kana).length <= 6)
}

export function eligible(faces) {
  if (eligibleWords(faces).length < 1) {
    return { ok: false, reason: '需要至少 1 個讀音 2–6 假名且有中文的單詞' }
  }
  return { ok: true, reason: null }
}

const DIRS = { up: -SIZE, down: SIZE, left: -1, right: 1 }

function buildFood(round, faces, rng) {
  const state = round.state
  const word = state.queue[state.position]
  const chars = Array.from(word.kana)
  const startRow = 3
  const startCol = 1
  state.snake = [startRow * SIZE + startCol]
  state.dir = 'right'
  state.targetIndex = 0
  state.grid = new Array(SIZE * SIZE).fill(null)
  // Place the target word in a straight reachable line to the right.
  chars.forEach((ch, i) => {
    state.grid[(startRow) * SIZE + (startCol + 1 + i)] = { char: ch, target: true }
  })
  // Distractors fill the rest.
  for (let i = 0; i < SIZE * SIZE; i += 1) {
    if (state.grid[i] === null && i !== state.snake[0]) {
      state.grid[i] = { char: KANA[Math.floor(rng01(rng) * KANA.length)], target: false }
    }
  }
  markFood(state)
  state.phase = 'play'
}

function markFood(state) {
  const word = state.queue[state.position]
  const expected = Array.from(word.kana)[state.targetIndex]
  state.foodAt = null
  if (expected == null) return
  for (let i = 0; i < state.grid.length; i += 1) {
    const cell = state.grid[i]
    if (cell?.target && cell.char === expected && !state.snake.includes(i)) {
      state.foodAt = i
      break
    }
  }
}

function dropEmptyTail(state, rng) {
  if (state.snake.length <= 1) return
  const tail = state.snake[state.snake.length - 1]
  if (state.grid[tail] == null) {
    state.snake.pop()
    // Fill the vacated start cell so it does not remain a hole in the kana grid.
    state.grid[tail] = { char: KANA[Math.floor(rng01(rng) * KANA.length)], target: false }
  }
}

export function create(round, faces, _poolFaces, rng) {
  round.state = {
    queue: shuffled(eligibleWords(faces), rng),
    position: 0,
    snake: [],
    dir: 'right',
    grid: [],
    targetIndex: 0,
    score: 0,
    phase: 'play',
  }
  buildFood(round, faces, rng)
}

function resetSnake(round, rng) {
  const state = round.state
  const startRow = 3
  const startCol = 1
  state.snake = [startRow * SIZE + startCol]
  state.dir = 'right'
  state.targetIndex = 0
  buildFood(round, round.faces, rng)
}

export function act(round, action) {
  const state = round.state
  if (state.phase !== 'play') return { life: 0, score: 0, clock: null, message: null }
  if (action.type === 'dir' && typeof action.value === 'string' && DIRS[action.value]) {
    const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' }
    const effective = state.pendingDir ?? state.dir
    if (opposite[action.value] !== effective) state.pendingDir = action.value
    return { life: 0, score: 0, clock: null, message: null }
  }
  if (action.type === 'tick') {
    if (state.pendingDir) {
      state.dir = state.pendingDir
      state.pendingDir = null
    }
    const head = state.snake[0]
    const row = Math.floor(head / SIZE)
    const col = head % SIZE
    const next = head + DIRS[state.dir]
    const nr = Math.floor(next / SIZE)
    const nc = next % SIZE
    if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE || state.snake.includes(next)) {
      round.streak = 0
      resetSnake(round, round.rng)
      return { life: -1, score: 0, clock: null, message: '碰撞' }
    }
    const cell = state.grid[next]
    if (cell?.target) {
      const word = state.queue[state.position]
      const expected = Array.from(word.kana)[state.targetIndex]
      if (cell.char === expected) {
        state.snake.unshift(next)
        // Keep the eaten kana on the body so the snake does not punch holes
        // in the grid. Only the next expected letter is marked as food.
        state.grid[next] = { char: cell.char, target: false }
        dropEmptyTail(state, round.rng)
        state.targetIndex += 1
        markFood(state)
        round.streak += 1
        if (state.targetIndex >= Array.from(word.kana).length) {
          state.position += 1
          if (state.position >= state.queue.length) {
            round.done = true
            round.cleared = true
            state.phase = 'done'
            return { life: 0, score: 25 + round.streak * 5, clock: 'stop', message: '吃完' }
          }
          buildFood(round, round.faces, round.rng)
          return { life: 0, score: 10 + round.streak * 5, clock: 'reset', message: '吃完整詞' }
        }
        return { life: 0, score: 5, clock: null, message: '吃一字' }
      }
      // Wrong-order target: penalise and reset.
      round.streak = 0
      resetSnake(round, round.rng)
      return { life: -1, score: 0, clock: null, message: '吃錯順序' }
    }
    if (cell) {
      round.streak = 0
      resetSnake(round, round.rng)
      return { life: -1, score: 0, clock: null, message: '吃到干擾字' }
    }
    // Move forward onto an empty cell; drop the tail and clear its letter.
    const left = state.snake[state.snake.length - 1]
    state.snake.unshift(next)
    state.snake.pop()
    if (!state.snake.includes(left) && state.grid[left] && !state.grid[left].target) {
      state.grid[left] = null
    }
    return { life: 0, score: 0, clock: null, message: null }
  }
  if (action.type === 'timeout') {
    round.done = true
    round.cleared = false
    state.phase = 'done'
    return { life: -1, score: 0, clock: 'stop', message: '時間到' }
  }
  return { life: 0, score: 0, clock: null, message: null }
}
