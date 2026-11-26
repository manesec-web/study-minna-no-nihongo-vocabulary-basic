// 音拍猜謎 (mora): show kanji + Chinese, pick the correct mora count. Small
// ゃゅょぁぃぅぇぉ combine with the preceding kana; ん / っ / ー each count one.
import { rng01, shuffled } from './shared.js'

export const usesPool = false
export const usesRng = true

const SMALL = 'ゃゅょぁぃぅぇぉ'

export function countMora(kana) {
  const chars = Array.from(kana)
  let mora = 0
  for (const ch of chars) {
    if (SMALL.includes(ch)) continue
    mora += 1
  }
  return mora
}

function eligibleWords(faces) {
  return faces.filter((f) => f.hasKanji && f.kana && f.zh)
}

export function eligible(faces) {
  if (eligibleWords(faces).length < 1) {
    return { ok: false, reason: '需要至少 1 個「有漢字、讀音與中文」的單詞' }
  }
  return { ok: true, reason: null }
}

export function create(round, faces, _poolFaces, rng) {
  const word = shuffled(eligibleWords(faces), rng)[0]
  const correct = countMora(word.kana)
  const seen = new Set([correct])
  const options = [correct]
  let delta = 1
  while (options.length < 4) {
    for (const candidate of [correct + delta, correct - delta]) {
      if (candidate >= 1 && candidate <= 8 && !seen.has(candidate)) {
        seen.add(candidate)
        options.push(candidate)
        if (options.length >= 4) break
      }
    }
    delta += 1
  }
  round.state = {
    prompt: word.kanji,
    promptZh: word.zh,
    options: shuffled(options, rng),
    correct,
    phase: 'ask',
  }
}

export function act(round, action) {
  const state = round.state
  if (action.type === 'choose' && state.phase === 'ask') {
    const option = state.options[action.index]
    if (option === undefined) return { life: 0, score: 0, clock: null, message: null }
    if (option === state.correct) {
      round.streak += 1
      round.flash = null
      round.done = true
      round.cleared = true
      state.phase = 'done'
      return { life: 0, score: 15 + round.streak * 5, clock: 'stop', message: '音拍正確' }
    }
    round.streak = 0
    round.flash = 'wrong'
    round.reveal = { text: String(state.correct) }
    state.phase = 'reveal'
    return { life: -1, score: 0, clock: 'stop', message: '音拍錯誤' }
  }
  if (action.type === 'confirm' && state.phase === 'reveal') {
    round.reveal = null
    round.flash = null
    round.done = true
    round.cleared = false
    state.phase = 'done'
    return { life: 0, score: 0, clock: 'stop', message: null }
  }
  if (action.type === 'timeout' && state.phase === 'ask') {
    round.streak = 0
    round.flash = 'wrong'
    round.reveal = { text: String(state.correct) }
    state.phase = 'reveal'
    return { life: -1, score: 0, clock: 'stop', message: '時間到' }
  }
  return { life: 0, score: 0, clock: null, message: null }
}
