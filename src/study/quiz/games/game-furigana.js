// 振假名狙擊 (furigana): show the kanji + Chinese meaning, pick the correct
// hiragana reading from eight unique options. Distractors are other words'
// readings, never an alias of the same word.
import { faceOf, shuffled } from './shared.js'

export const usesPool = false
export const usesRng = true

function eligibleWords(faces) {
  return faces.filter((f) => f.hasKanji && f.kana && f.zh)
}

export function eligible(faces) {
  const words = eligibleWords(faces)
  if (words.length < 2) {
    return { ok: false, reason: '需要至少 2 個「有漢字且有讀音」的單詞' }
  }
  if (new Set(words.map((w) => w.kana)).size < 2) {
    return { ok: false, reason: '合格單詞的讀音不夠多樣，無法產生可區分的選項' }
  }
  return { ok: true, reason: null }
}

function buildQuestion(round, rng) {
  const word = round.state.words[round.state.index]
  const correct = word.kana
  const seen = new Set([correct])
  const options = [correct]
  for (const other of shuffled(round.state.words, rng)) {
    if (other.ref === word.ref || seen.has(other.kana)) continue
    seen.add(other.kana)
    options.push(other.kana)
    if (options.length >= 8) break
  }
  round.state.prompt = word.kanji
  round.state.promptZh = word.zh
  round.state.options = shuffled(options, rng)
  round.state.correct = correct
  round.state.phase = 'ask'
  round.reveal = null
  round.flash = null
}

export function create(round, faces, _poolFaces, rng) {
  round.state = {
    words: eligibleWords(faces),
    index: 0,
    prompt: '',
    promptZh: '',
    options: [],
    correct: '',
    phase: 'ask',
  }
  buildQuestion(round, rng)
}

export function act(round, action) {
  const state = round.state
  if (action.type === 'choose' && state.phase === 'ask') {
    const option = state.options[action.index]
    if (!option) return { life: 0, score: 0, clock: null, message: null }
    if (option === state.correct) {
      round.streak += 1
      round.flash = null
      state.index += 1
      if (state.index >= state.words.length) {
        round.done = true
        round.cleared = true
        state.phase = 'done'
        return { life: 0, score: 20 + round.streak * 5, clock: 'stop', message: '完成' }
      }
      buildQuestion(round, round.rng)
      return { life: 0, score: 10 + round.streak, clock: 'reset', message: '正確' }
    }
    round.streak = 0
    round.flash = 'wrong'
    round.reveal = { text: state.correct }
    state.phase = 'reveal'
    return { life: -1, score: 0, clock: 'stop', message: '錯誤' }
  }
  if (action.type === 'confirm' && state.phase === 'reveal') {
    round.reveal = null
    round.flash = null
    state.index += 1
    if (state.index >= state.words.length) {
      round.done = true
      round.cleared = false
      state.phase = 'done'
      return { life: 0, score: 0, clock: 'stop', message: null }
    }
    buildQuestion(round, round.rng)
    return { life: 0, score: 0, clock: 'start', message: null }
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
