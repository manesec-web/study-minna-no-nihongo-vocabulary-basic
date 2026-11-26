// 日語版 Wordle (wordle): guess a 4–5 kana reading. Colours follow the standard
// two-pass rule so repeated kana are counted correctly. Non-dictionary guesses
// are allowed; only the length gate consumes nothing on invalid input.
import { rng01, shuffled } from './shared.js'

export const usesPool = false
export const usesRng = true

export const WORDLE_KANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんぁぃぅぇぉゃゅょっがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽー'

export function eligible(faces) {
  const usable = faces.filter((f) => {
    const len = Array.from(f.kana).length
    return len === 4 || len === 5
  })
  if (usable.length === 0) return { ok: false, reason: '需要至少 1 個正規化後為 4 或 5 假名的單詞' }
  return { ok: true, reason: null }
}

export function colorGuess(target, guess) {
  const targetChars = Array.from(target)
  const guessChars = Array.from(guess)
  const result = new Array(guessChars.length).fill('muted')
  const remaining = {}
  for (const ch of targetChars) remaining[ch] = (remaining[ch] ?? 0) + 1
  // First pass: exact position.
  for (let i = 0; i < guessChars.length; i += 1) {
    if (guessChars[i] === targetChars[i]) {
      result[i] = 'green'
      remaining[guessChars[i]] -= 1
    }
  }
  // Second pass: present but wrong position.
  for (let i = 0; i < guessChars.length; i += 1) {
    if (result[i] !== 'green' && (remaining[guessChars[i]] ?? 0) > 0) {
      result[i] = 'yellow'
      remaining[guessChars[i]] -= 1
    }
  }
  return result
}

function pickTarget(round, faces, rng) {
  const usable = []
  for (const face of faces) {
    const len = Array.from(face.kana).length
    if (len === 4 || len === 5) usable.push(face)
  }
  const target = usable.length ? shuffled(usable, rng)[0] : faces[0]
  round.state.target = Array.from(target.kana).join('')
  round.state.hint = target.zh
  round.state.length = Array.from(target.kana).length
}

export function create(round, faces, _poolFaces, rng) {
  round.state = {
    target: '',
    hint: '',
    length: 0,
    input: '',
    guesses: [],
    maxGuesses: 6,
    hard: false,
    phase: 'play',
  }
  pickTarget(round, faces, rng)
}

export function act(round, action) {
  const state = round.state
  if (state.phase !== 'play') return { life: 0, score: 0, clock: null, message: null }
  if (action.type === 'toggle') {
    state.hard = !state.hard
    return { life: 0, score: 0, clock: null, message: null }
  }
  if (action.type === 'input' && typeof action.value === 'string') {
    if (state.input.length < state.length) state.input += action.value
    return { life: 0, score: 0, clock: null, message: null }
  }
  if (action.type === 'backspace') {
    state.input = state.input.slice(0, -1)
    return { life: 0, score: 0, clock: null, message: null }
  }
  if (action.type === 'submit') {
    if (state.input.length !== state.length) {
      return { life: 0, score: 0, clock: null, message: '長度不符' }
    }
    const colors = colorGuess(state.target, state.input)
    state.guesses.push({ text: state.input, colors })
    const win = state.input === state.target
    state.input = ''
    if (win) {
      round.done = true
      round.cleared = true
      state.phase = 'done'
      return { life: 0, score: 30 + round.streak * 5, clock: 'stop', message: '猜中' }
    }
    if (state.guesses.length >= state.maxGuesses) {
      round.done = true
      round.cleared = false
      state.phase = 'done'
      round.reveal = { text: state.target }
      return { life: -1, score: 0, clock: 'stop', message: '次數用盡' }
    }
    round.streak = 0
    return { life: 0, score: 0, clock: null, message: null }
  }
  if (action.type === 'timeout') {
    round.done = true
    round.cleared = false
    round.reveal = { text: state.target }
    state.phase = 'done'
    return { life: -1, score: 0, clock: 'stop', message: '時間到' }
  }
  return { life: 0, score: 0, clock: null, message: null }
}
