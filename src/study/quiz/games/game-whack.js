// 打地鼠 (whack): a target on top, nine holes where one mole pops up at a time.
// A mole stays up for 1s then hides for 2s, then the next mole appears in a
// different hole with a different word/face. Tap a mole matching the target to
// score; tap the wrong mole to lose time. Uses a fixed 60-second internal timer
// when the session is infinite.
import { faceOf, pick, rng01, shuffled } from './shared.js'

export const usesPool = false
export const usesRng = true

const INTERNAL_SECONDS = 60
const HOLE_COUNT = 9
// 1s up / 2s down, driven by the view's 1s visibility interval: one tick while
// up hides the mole, then two ticks while down bring the next mole up.
const DOWN_TICKS = 2

export function eligible(faces) {
  const distinct = new Set(faces.map((f) => faceOf(f, 'jp')).filter(Boolean)).size
  if (faces.length < 2 || distinct < 2) {
    return { ok: false, reason: '需要至少 2 個不同日語面的單詞才能產生地鼠' }
  }
  return { ok: true, reason: null }
}

function holeFor(round, word, face) {
  return { word, face, visible: false, hit: false }
}

// Fill the nine holes with distinct word/face texts where the pool allows. The
// target word is included once so a correct mole can appear; the rest cycle
// through the shuffled distractors (cycling only when the pool is smaller than
// nine, so the board is never all the same text).
function buildHoles(round, faces, rng) {
  const state = round.state
  // A new target is a new board for the purpose of the 10s hint clock.
  state.turn = (state.turn ?? 0) + 1
  const targetText = faceOf(faces[state.targetWord], state.face)
  let others = shuffled(
    faces.filter((f) => faceOf(f, state.face) !== targetText),
    rng,
  )
  if (others.length === 0) others = shuffled([...faces], rng)

  const holes = [holeFor(round, state.targetWord, state.face)]
  for (let i = 1; i < HOLE_COUNT; i += 1) {
    const other = others[(i - 1) % others.length]
    holes.push(holeFor(round, faces.indexOf(other), state.face))
  }

  state.holes = holes
  state.visibleIndex = -1
  state.lastIndex = -1
  state.lastWord = -1
  state.cycle = 'up'
  state.downTicks = 0
  appearMole(round, rng)
}

// Show exactly one mole, never in the same hole twice in a row, and prefer a
// word that differs from the previous appearance.
function appearMole(round, rng) {
  const state = round.state
  const n = state.holes.length
  let index = -1
  for (let attempt = 0; attempt < n * 2; attempt += 1) {
    const candidate = Math.floor(rng01(rng) * n)
    if (candidate === state.lastIndex) continue
    if (state.holes[candidate].word === state.lastWord) continue
    index = candidate
    break
  }
  if (index === -1) {
    for (let candidate = 0; candidate < n; candidate += 1) {
      if (candidate !== state.lastIndex) {
        index = candidate
        break
      }
    }
  }
  for (const hole of state.holes) hole.visible = false
  state.holes[index].visible = true
  state.visibleIndex = index
  state.lastIndex = index
  state.lastWord = state.holes[index].word
  state.cycle = 'up'
}

function nextTarget(round, faces, rng) {
  const state = round.state
  state.targetWord = (state.targetWord + 1 + Math.floor(rng01(rng) * (faces.length - 1))) % faces.length
  state.face = pick(['jp', 'kana'], rng)
  buildHoles(round, faces, rng)
}

export function create(round, faces, _poolFaces, rng) {
  round.state = {
    targetWord: 0,
    face: 'jp',
    holes: [],
    visibleIndex: -1,
    lastIndex: -1,
    lastWord: -1,
    cycle: 'up',
    downTicks: 0,
    score: 0,
    remaining: INTERNAL_SECONDS,
    turn: 0,
    phase: 'play',
  }
  if (round.baseClockSeconds > 0) round.state.remaining = round.baseClockSeconds
  buildHoles(round, faces, rng)
}

export function act(round, action) {
  const state = round.state
  if (state.phase !== 'play') return { life: 0, score: 0, clock: null, message: null }
  if (action.type === 'tap') {
    const hole = state.holes[action.index]
    if (!hole || !hole.visible || state.cycle !== 'up') {
      return { life: 0, score: 0, clock: null, message: null }
    }
    if (hole.word === state.targetWord) {
      hole.hit = true
      hole.visible = false
      state.visibleIndex = -1
      round.streak += 1
      round.flash = null
      nextTarget(round, round.faces, round.rng)
      return { life: 0, score: 10 + round.streak, clock: 'reset', message: '命中' }
    }
    round.streak = 0
    round.flash = 'wrong'
    state.remaining = Math.max(0, state.remaining - 5)
    return { life: 0, score: 0, clock: null, message: '打錯' }
  }
  if (action.type === 'tick') {
    state.remaining = Math.max(0, state.remaining - 1)
    if (state.remaining <= 0) {
      round.done = true
      round.cleared = true
      state.phase = 'done'
      return { life: 0, score: 0, clock: 'stop', message: '時間到' }
    }
    // 1s up → hide; 2s down → next mole.
    if (state.cycle === 'up') {
      for (const hole of state.holes) hole.visible = false
      state.visibleIndex = -1
      state.cycle = 'down'
      state.downTicks = 0
    } else {
      state.downTicks += 1
      if (state.downTicks >= DOWN_TICKS) {
        appearMole(round, round.rng)
      }
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
