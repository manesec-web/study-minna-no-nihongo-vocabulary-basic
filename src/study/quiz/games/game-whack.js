// 打地鼠 (whack): a Chinese target at the top, nine holes where moles pop up and
// vanish. Tap a correct mole to score; tap a wrong mole to lose time. The mode
// always keeps at least one correct mole visible so there is never an unfair
// empty window. Uses a fixed 60-second internal timer when the session is
// infinite.
import { faceOf, pick, rng01, shuffled } from './shared.js'

export const usesPool = false
export const usesRng = true

const INTERNAL_SECONDS = 60

export function eligible(faces) {
  const distinct = new Set(faces.map((f) => faceOf(f, 'jp')).filter(Boolean)).size
  if (faces.length < 2 || distinct < 2) {
    return { ok: false, reason: '需要至少 2 個不同日語面的單詞才能產生地鼠' }
  }
  return { ok: true, reason: null }
}

function buildHoles(round, faces, rng) {
  const state = round.state
  const target = faces[state.targetWord]
  const targetText = faceOf(target, state.face)
  const holes = []
  const others = shuffled(faces.filter((f) => faceOf(f, state.face) !== targetText), rng)
  // First hole is always the correct target and visible, so a correct answer is
  // always on screen.
  holes.push({ word: state.targetWord, face: state.face, visible: true, hit: false })
  for (let i = 1; i < 9; i += 1) {
    const other = others[i % others.length]
    const word = faces.indexOf(other)
    holes.push({ word, face: state.face, visible: pick([true, false], rng), hit: false })
  }
  state.holes = shuffled(holes, rng)
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
    score: 0,
    remaining: INTERNAL_SECONDS,
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
    if (!hole) return { life: 0, score: 0, clock: null, message: null }
    if (!hole.visible) return { life: 0, score: 0, clock: null, message: null }
    if (hole.word === state.targetWord) {
      hole.hit = true
      hole.visible = false
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
    // Refresh mole visibility but always leave the correct one visible.
    const correctIndex = state.holes.findIndex((h) => h.word === state.targetWord && h.visible)
    if (correctIndex === -1) {
      const correct = state.holes.find((h) => h.word === state.targetWord)
      if (correct) correct.visible = true
    }
    for (const hole of state.holes) {
      if (hole.word !== state.targetWord && !hole.hit) {
        hole.visible = pick([true, false], round.rng)
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
