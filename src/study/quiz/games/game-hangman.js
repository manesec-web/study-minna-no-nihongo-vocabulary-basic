// 五十音劊子手 (hangman): Chinese clue + one underline per kana; guess from a
// full gojuon keyboard (dakuten, handakuten, small kana, ー included). Guessing
// an existing kana reveals every occurrence; a wrong guess costs a life and a
// repeated guess is free. The answer is normalised hiragana.
import { shuffled } from './shared.js'

export const usesPool = false
export const usesRng = true

export const HANGMAN_KANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽっゃゅょー'

function eligibleWords(faces) {
  return faces.filter((f) => f.zh && f.kana && Array.from(f.kana).length >= 1)
}

export function eligible(faces) {
  if (eligibleWords(faces).length < 1) {
    return { ok: false, reason: '需要至少 1 個有讀音與中文的單詞' }
  }
  return { ok: true, reason: null }
}

export function create(round, faces, _poolFaces, rng) {
  const word = shuffled(eligibleWords(faces), rng)[0]
  round.state = {
    target: Array.from(word.kana),
    clue: word.zh,
    guessed: [],
    wrong: 0,
    maxWrong: 6,
    phase: 'play',
  }
}

export function act(round, action) {
  const state = round.state
  if (state.phase !== 'play') return { life: 0, score: 0, clock: null, message: null }
  if (action.type === 'input' && typeof action.value === 'string') {
    const ch = action.value
    if (!ch || state.guessed.includes(ch)) {
      return { life: 0, score: 0, clock: null, message: null }
    }
    state.guessed.push(ch)
    if (state.target.includes(ch)) {
      round.streak += 1
      const won = state.target.every((c) => state.guessed.includes(c))
      if (won) {
        round.done = true
        round.cleared = true
        state.phase = 'done'
        return { life: 0, score: 20 + round.streak * 5, clock: 'stop', message: '猜中' }
      }
      return { life: 0, score: 5, clock: null, message: '命中' }
    }
    state.wrong += 1
    round.streak = 0
    if (state.wrong >= state.maxWrong) {
      round.done = true
      round.cleared = false
      state.phase = 'done'
      round.reveal = { text: state.target.join('') }
      return { life: -1, score: 0, clock: 'stop', message: '用盡次數' }
    }
    return { life: -1, score: 0, clock: null, message: '猜錯' }
  }
  if (action.type === 'timeout') {
    round.done = true
    round.cleared = false
    state.phase = 'done'
    round.reveal = { text: state.target.join('') }
    return { life: -1, score: 0, clock: 'stop', message: '時間到' }
  }
  return { life: 0, score: 0, clock: null, message: null }
}
