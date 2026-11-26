// 找出內鬼 (oddone): four 日文＋中文 groups, exactly three correct and one
// mismatched. Tap the mismatched group. Uses a local per-question countdown even
// when the session timer is infinite.
import { faceOf, pick, rng01, shuffled } from './shared.js'

export const usesPool = false
export const usesRng = true

const LOCAL_SECONDS = 15

export function eligible(faces) {
  const distinctZh = new Set(faces.map((f) => f.zh).filter(Boolean)).size
  if (faces.length < 4) return { ok: false, reason: '至少需要 4 個單詞才能組成 3 對正確加 1 對錯誤' }
  if (distinctZh < 2) return { ok: false, reason: '需要至少 2 個不同的中文意思才能製造內鬼' }
  return { ok: true, reason: null }
}

function buildQuestion(round, faces, rng) {
  const order = shuffled(faces.map((_f, at) => at), rng)
  const words = order.slice(0, 4)
  const oddAt = Math.floor(rng01(rng) * 4)
  const groups = words.map((wordIndex, at) => {
    const face = pick(['jp', 'kana'], rng)
    let chinese = faces[wordIndex].zh
    if (at === oddAt) {
      const other = words.find((w) => w !== wordIndex && faces[w].zh !== chinese)
      chinese = faces[other ?? words[(wordIndex + 1) % words.length]].zh
    }
    return { word: wordIndex, face, japanese: faceOf(faces[wordIndex], face), chinese }
  })
  round.state.groups = groups
  round.state.oddIndex = oddAt
  round.state.phase = 'ask'
  round.reveal = null
  round.flash = null
}

export function create(round, faces, _poolFaces, rng) {
  round.state = {
    groups: [],
    oddIndex: -1,
    phase: 'ask',
    played: 0,
    total: Math.max(1, Math.floor(faces.length / 4)),
  }
  if (round.baseClockSeconds <= 0) {
    round.clockSeconds = LOCAL_SECONDS
    round.clock.seconds = LOCAL_SECONDS
    round.clock.active = true
  }
  buildQuestion(round, faces, rng)
}

function advance(round, faces, rng) {
  round.state.played += 1
  if (round.state.played >= round.state.total) {
    round.done = true
    round.cleared = true
    round.state.phase = 'done'
    return { life: 0, score: 0, clock: 'stop', message: '完成' }
  }
  buildQuestion(round, faces, rng)
  return { life: 0, score: 0, clock: 'reset', message: null }
}

export function act(round, action) {
  const state = round.state
  if (action.type === 'tap' && state.phase === 'ask') {
    if (action.index === state.oddIndex) {
      round.streak += 1
      round.flash = null
      const ev = advance(round, round.faces, round.rng)
      return { life: 0, score: 10 + round.streak, clock: ev.clock, message: '找到內鬼' }
    }
    round.streak = 0
    round.flash = 'wrong'
    round.reveal = { text: state.groups[state.oddIndex].chinese }
    state.phase = 'reveal'
    return { life: -1, score: 0, clock: 'stop', message: '找錯內鬼' }
  }
  if (action.type === 'confirm' && state.phase === 'reveal') {
    round.reveal = null
    round.flash = null
    return advance(round, round.faces, round.rng)
  }
  if (action.type === 'timeout' && state.phase === 'ask') {
    round.streak = 0
    round.flash = 'wrong'
    round.reveal = { text: state.groups[state.oddIndex].chinese }
    state.phase = 'reveal'
    return { life: -1, score: 0, clock: 'stop', message: '時間到' }
  }
  return { life: 0, score: 0, clock: null, message: null }
}
