// 迴轉壽司打字 (sushi): a kanji + Chinese plate moves right-to-left; type the
// correct reading before it leaves. Accepts direct IME kana and a small romaji
// fallback (no new dependency). Only an exactly normalised match consumes the
// plate; a plate that leaves costs a life. The view drives the movement ticks.
import { shuffled } from './shared.js'

export const usesPool = false
export const usesRng = true

const ROMAJI = [
  ['kya', 'きゃ'], ['kyu', 'きゅ'], ['kyo', 'きょ'], ['sha', 'しゃ'], ['shu', 'しゅ'], ['sho', 'しょ'],
  ['cha', 'ちゃ'], ['chu', 'ちゅ'], ['cho', 'ちょ'], ['nya', 'にゃ'], ['nyu', 'にゅ'], ['nyo', 'にょ'],
  ['hya', 'ひゃ'], ['hyu', 'ひゅ'], ['hyo', 'ひょ'], ['mya', 'みゃ'], ['myu', 'みゅ'], ['myo', 'みょ'],
  ['rya', 'りゃ'], ['ryu', 'りゅ'], ['ryo', 'りょ'], ['gya', 'ぎゃ'], ['gyu', 'ぎゅ'], ['gyo', 'ぎょ'],
  ['ja', 'じゃ'], ['ju', 'じゅ'], ['jo', 'じょ'], ['bya', 'びゃ'], ['byu', 'びゅ'], ['byo', 'びょ'],
  ['pya', 'ぴゃ'], ['pyu', 'ぴゅ'], ['pyo', 'ぴょ'],
  ['a', 'あ'], ['i', 'い'], ['u', 'う'], ['e', 'え'], ['o', 'お'],
  ['ka', 'か'], ['ki', 'き'], ['ku', 'く'], ['ke', 'け'], ['ko', 'こ'],
  ['sa', 'さ'], ['shi', 'し'], ['su', 'す'], ['se', 'せ'], ['so', 'そ'],
  ['ta', 'た'], ['chi', 'ち'], ['tsu', 'つ'], ['te', 'て'], ['to', 'と'],
  ['na', 'な'], ['ni', 'に'], ['nu', 'ぬ'], ['ne', 'ね'], ['no', 'の'],
  ['ha', 'は'], ['hi', 'ひ'], ['fu', 'ふ'], ['he', 'へ'], ['ho', 'ほ'],
  ['ma', 'ま'], ['mi', 'み'], ['mu', 'む'], ['me', 'め'], ['mo', 'も'],
  ['ya', 'や'], ['yu', 'ゆ'], ['yo', 'よ'],
  ['ra', 'ら'], ['ri', 'り'], ['ru', 'る'], ['re', 'れ'], ['ro', 'ろ'],
  ['wa', 'わ'], ['wo', 'を'], ['n', 'ん'],
  ['ga', 'が'], ['gi', 'ぎ'], ['gu', 'ぐ'], ['ge', 'げ'], ['go', 'ご'],
  ['za', 'ざ'], ['ji', 'じ'], ['zu', 'ず'], ['ze', 'ぜ'], ['zo', 'ぞ'],
  ['da', 'だ'], ['di', 'ぢ'], ['du', 'づ'], ['de', 'で'], ['do', 'ど'],
  ['ba', 'ば'], ['bi', 'び'], ['bu', 'ぶ'], ['be', 'べ'], ['bo', 'ぼ'],
  ['pa', 'ぱ'], ['pi', 'ぴ'], ['pu', 'ぷ'], ['pe', 'ぺ'], ['po', 'ぽ'],
]

export function romajiToHiragana(input) {
  let rest = input.toLowerCase().replace(/-/g, 'ー').replace(/[^a-zー]/g, '')
  let out = ''
  const consonants = 'kstnhmyrwgzdbpcjfv'
  while (rest.length) {
    if (
      rest.length >= 2 &&
      rest[0] === rest[1] &&
      consonants.includes(rest[0]) &&
      rest[0] !== 'n'
    ) {
      out += 'っ'
      rest = rest.slice(1)
      continue
    }
    // ん before a consonant or at the end; before a vowel/y it is na/ni/ny…
    if (rest[0] === 'n' && !('aiueo'.includes(rest[1] ?? '') || rest[1] === 'y')) {
      out += 'ん'
      rest = rest.slice(1)
      continue
    }
    let matched = false
    for (const [romaji, kana] of ROMAJI) {
      if (rest.startsWith(romaji)) {
        out += kana
        rest = rest.slice(romaji.length)
        matched = true
        break
      }
    }
    if (!matched) {
      out += rest[0]
      rest = rest.slice(1)
    }
  }
  return out
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
  const words = shuffled(eligibleWords(faces), rng)
  round.state = {
    queue: words,
    position: 0,
    x: 0,
    typed: '',
    hit: 0,
    phase: 'play',
  }
}

function spawn(round) {
  const state = round.state
  if (state.position >= state.queue.length) {
    round.done = true
    round.cleared = state.hit >= state.queue.length
    state.phase = 'done'
    return false
  }
  state.x = 0
  state.typed = ''
  return true
}

export function act(round, action) {
  const state = round.state
  if (state.phase !== 'play') return { life: 0, score: 0, clock: null, message: null }
  if (action.type === 'input' && typeof action.value === 'string') {
    state.typed = action.value
    return { life: 0, score: 0, clock: null, message: null }
  }
  if (action.type === 'submit') {
    const word = state.queue[state.position]
    const raw = (state.typed || '').trim()
    const normalized = /^[a-z]+$/i.test(raw) ? romajiToHiragana(raw) : raw
    if (normalized === word.kana) {
      state.hit += 1
      state.position += 1
      round.streak += 1
      const spawned = spawn(round)
      if (!spawned) {
        return { life: 0, score: 20 + round.streak * 5, clock: 'stop', message: round.cleared ? '全部吃完' : '結束' }
      }
      return { life: 0, score: 10 + round.streak * 5, clock: 'reset', message: '吃完一盤' }
    }
    return { life: 0, score: 0, clock: null, message: null }
  }
  if (action.type === 'tick') {
    state.x += 1
    if (state.x >= 20) {
      state.position += 1
      round.streak = 0
      const spawned = spawn(round)
      if (!spawned) {
        return { life: -1, score: 0, clock: 'stop', message: round.cleared ? '全部吃完' : '結束' }
      }
      return { life: -1, score: 0, clock: null, message: '漏掉一盤' }
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
