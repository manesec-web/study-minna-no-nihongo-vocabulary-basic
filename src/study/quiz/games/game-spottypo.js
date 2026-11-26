// 平假名大家來找碴 (spottypo): six 漢字＋假名＋中文 cards, exactly five correct
// and one whose reading had a single kana changed. Tap the changed card before
// the timer runs out.
import { rng01, shuffled } from './shared.js'

export const usesPool = false
export const usesRng = true

const KANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'

function eligibleWords(faces) {
  return faces.filter((f) => f.hasKanji && f.kana && f.zh && Array.from(f.kana).length >= 2)
}

export function eligible(faces) {
  const words = eligibleWords(faces)
  if (words.length < 6) {
    return { ok: false, reason: '需要至少 6 個「有漢字、讀音與中文」且讀音 ≥2 假名的單詞' }
  }
  return { ok: true, reason: null }
}

function changeOne(kana, rng) {
  const chars = Array.from(kana)
  const at = Math.floor(rng01(rng) * chars.length)
  const pool = KANA.replace(chars[at], '')
  chars[at] = pool[Math.floor(rng01(rng) * pool.length)]
  return chars.join('')
}

export function create(round, faces, _poolFaces, rng) {
  const words = shuffled(eligibleWords(faces), rng).slice(0, 6)
  const oddAt = Math.floor(rng01(rng) * 6)
  const cards = words.map((word, at) => {
    const kana = at === oddAt ? changeOne(word.kana, rng) : word.kana
    return { word: word.ref, kanji: word.kanji, kana, zh: word.zh }
  })
  round.state = { cards, oddIndex: oddAt, phase: 'ask' }
  round.reveal = null
  round.flash = null
}

export function act(round, action) {
  const state = round.state
  if (action.type === 'tap' && state.phase === 'ask') {
    if (action.index === state.oddIndex) {
      round.streak += 1
      round.flash = null
      round.done = true
      round.cleared = true
      state.phase = 'done'
      return { life: 0, score: 20 + round.streak * 5, clock: 'stop', message: '找到了' }
    }
    round.streak = 0
    round.flash = 'wrong'
    round.reveal = { text: state.cards[state.oddIndex].kana }
    state.phase = 'reveal'
    return { life: -1, score: 0, clock: 'stop', message: '找錯' }
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
    round.reveal = { text: state.cards[state.oddIndex].kana }
    state.phase = 'reveal'
    return { life: -1, score: 0, clock: 'stop', message: '時間到' }
  }
  return { life: 0, score: 0, clock: null, message: null }
}
