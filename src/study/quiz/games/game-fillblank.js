// 缺字填空 (fillblank): show a Chinese meaning plus a reading with one grapheme
// removed; pick the missing grapheme from exactly 8 unique options. Unicode-safe
// via Array.from (Japanese readings in the dictionary are precomposed kana, so
// this never splits a single character into its components).
import { rng01, shuffled } from './shared.js'

export const usesPool = false
export const usesRng = true

const DISTRACTOR_KANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'

export function eligible(faces) {
  const usable = faces.filter((f) => Array.from(f.kana).length >= 2)
  if (usable.length === 0) return { ok: false, reason: '需要至少 1 個讀音長度 ≥2 的單詞才能挖空' }
  return { ok: true, reason: null }
}

function buildQuestion(round, faces, rng) {
  const word = faces[round.state.index]
  const chars = Array.from(word.kana)
  const blankAt = Math.floor(rng01(rng) * chars.length)
  const correct = chars[blankAt]
  const seen = new Set([correct])
  const options = [correct]
  for (let i = 0; i < 80 && options.length < 8; i += 1) {
    const ch = DISTRACTOR_KANA[Math.floor(rng01(rng) * DISTRACTOR_KANA.length)]
    if (seen.has(ch)) continue
    seen.add(ch)
    options.push(ch)
  }
  round.state.chars = chars
  round.state.blankAt = blankAt
  round.state.correct = correct
  round.state.options = shuffled(options, rng)
  round.state.prompt = word.zh
  round.state.phase = 'ask'
  round.reveal = null
  round.flash = null
}

export function create(round, faces, _poolFaces, rng) {
  round.state = { index: 0, chars: [], blankAt: 0, correct: '', options: [], prompt: '', phase: 'ask' }
  buildQuestion(round, faces, rng)
}

function advance(round, faces, rng) {
  round.state.index += 1
  if (round.state.index >= round.faces.length) {
    round.done = true
    round.cleared = true
    round.state.phase = 'done'
    return { life: 0, score: 0, clock: 'stop', message: null }
  }
  buildQuestion(round, faces, rng)
  return { life: 0, score: 0, clock: 'start', message: null }
}

export function act(round, action) {
  const state = round.state
  if (action.type === 'choose' && state.phase === 'ask') {
    const option = state.options[action.index]
    if (!option) return { life: 0, score: 0, clock: null, message: null }
    if (option === state.correct) {
      round.streak += 1
      round.flash = null
      const ev = advance(round, round.faces, round.rng)
      return { life: 0, score: 10 + round.streak, clock: ev.clock, message: '填入正確' }
    }
    round.streak = 0
    round.flash = 'wrong'
    round.reveal = { text: state.correct }
    state.phase = 'reveal'
    return { life: -1, score: 0, clock: 'stop', message: '填入錯誤' }
  }
  if (action.type === 'confirm' && state.phase === 'reveal') {
    round.reveal = null
    round.flash = null
    return advance(round, round.faces, round.rng)
  }
  if (action.type === 'timeout' && state.phase === 'ask') {
    round.streak = 0
    round.flash = 'wrong'
    round.reveal = { text: state.correct }
    state.phase = 'reveal'
    return { life: -1, score: 0, clock: 'stop', message: '時間到' }
  }
  return { life: 0, score: 0, clock: null, message: null }
}
