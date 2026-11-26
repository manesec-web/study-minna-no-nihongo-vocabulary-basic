// 極速是非題 (swipe): a central Japanese word + one Chinese translation that is
// randomly a true or false pairing. Right/true and left/false are both a
// judgement; the view offers swipe gestures AND explicit buttons that share the
// same resolved guard so a single question can only score once.
import { faceOf, FACES, pick, shuffled } from './shared.js'

export const usesPool = false
export const usesRng = true

export function eligible(faces) {
  const withZh = faces.filter((f) => f.zh)
  if (faces.length < 2) return { ok: false, reason: '至少需要 2 個單詞才能產生錯誤配對' }
  if (new Set(withZh.map((f) => f.zh)).size < 2) {
    return { ok: false, reason: '需要至少 2 個不同的中文意思才能產生錯誤配對' }
  }
  return { ok: true, reason: null }
}

function buildQuestion(round, faces, rng) {
  const index = round.state.order[round.state.position]
  const word = faces[index]
  const promptFace = pick(['jp', 'kana'], rng)
  const isMatch = pick([true, false], rng)
  let chinese = word.zh
  if (!isMatch) {
    const others = faces.filter((f) => f.zh && f.zh !== word.zh)
    chinese = others.length ? pick(others, rng).zh : word.zh
  }
  round.state.question = {
    word: index,
    promptFace,
    japanese: faceOf(word, promptFace),
    chinese,
    isMatch,
  }
  round.state.resolved = false
  round.state.phase = 'ask'
}

export function create(round, faces, _poolFaces, rng) {
  round.state = {
    order: shuffled(faces.map((_f, at) => at), rng),
    position: 0,
    phase: 'ask',
    resolved: false,
    question: null,
  }
  buildQuestion(round, faces, rng)
}

function advance(round, faces, rng) {
  round.state.position += 1
  if (round.state.position >= round.state.order.length) {
    round.done = true
    round.cleared = true
    round.state.phase = 'done'
    return
  }
  buildQuestion(round, faces, rng)
}

export function act(round, action) {
  const state = round.state
  if (action.type === 'judge' && state.phase === 'ask' && !state.resolved) {
    state.resolved = true
    const correct = (action.value === true) === state.question.isMatch
    if (correct) {
      round.streak += 1
      round.flash = null
      advance(round, round.faces, round.rng)
      return { life: 0, score: 10 + round.streak, clock: 'reset', message: '判斷正確' }
    }
    round.streak = 0
    round.flash = 'wrong'
    round.reveal = { text: state.question.isMatch ? '正確配對' : '錯誤配對' }
    state.phase = 'reveal'
    return { life: -1, score: 0, clock: 'stop', message: '判斷錯誤' }
  }
  if (action.type === 'confirm' && state.phase === 'reveal') {
    round.reveal = null
    round.flash = null
    advance(round, round.faces, round.rng)
    return { life: 0, score: 0, clock: 'start', message: null }
  }
  if (action.type === 'timeout' && state.phase === 'ask') {
    state.resolved = true
    round.streak = 0
    round.flash = 'wrong'
    round.reveal = { text: state.question.isMatch ? '正確配對' : '錯誤配對' }
    state.phase = 'reveal'
    return { life: -1, score: 0, clock: 'stop', message: '時間到' }
  }
  return { life: 0, score: 0, clock: null, message: null }
}
