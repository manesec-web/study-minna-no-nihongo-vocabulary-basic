// Shared pure helpers for the per-game state machines. Each game module lives
// beside this file and imports only from here, ../faces.js, and ../shuffle.js —
// never from the DOM, the store, or the command layer.
import { shuffle } from '../../shuffle.js'
import { faceOf, FACES, sameRef } from '../faces.js'

export { faceOf, FACES, sameRef }

export function rng01(rng) {
  const value = Number(rng()) || 0
  return Math.min(0.999999, Math.max(0, value))
}

export function pick(arr, rng) {
  if (!arr.length) return undefined
  return arr[Math.floor(rng01(rng) * arr.length)]
}

export function shuffled(arr, rng) {
  return shuffle([...arr], rng)
}

// The on-screen kana pad for 猜假名 and 五十音劊子手 is 6×6 (36 keys). These
// are the 36 kana that occur most often in the shipped readings, laid out in
// gojuon order (plain kana first, then small kana, voiced kana and ー). A
// fixed 36 cannot hold every kana of every word, so buildKanaPad always
// swaps in the kana the current answer needs: a round is never unguessable.
export const KANA_PAD_SIZE = 36
export const KANA_CORE = 'あいうおかきくけこさしすせたちつてとなにはまみもらりれんゅょっがじでどー'

export function buildKanaPad(requiredChars, size = KANA_PAD_SIZE) {
  const required = Array.from(new Set(Array.from(requiredChars ?? ''))).filter(Boolean)
  const base = Array.from(KANA_CORE).slice(0, size)
  const missing = required.filter((ch) => !base.includes(ch))
  if (missing.length === 0) return base
  // Replace the tail of the core with the kana the current answer needs, so
  // the first keys keep their place from round to round.
  return [...base.slice(0, Math.max(0, size - missing.length)), ...missing]
}

export function chunk(items, size) {
  const out = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

// A no-change action result. `life` is a delta (0 or -1), `score` a delta,
// `clock` one of 'start' | 'stop' | 'reset' | null.
export function noop() {
  return { life: 0, score: 0, clock: null, message: null }
}

export function mcQuestion(word, poolFaces, rng, promptFace, answerFace, choiceCount = 5) {
  const correct = faceOf(word, answerFace)
  const seen = new Set([correct])
  const distractors = []
  for (const f of shuffled(poolFaces, rng)) {
    if (sameRef(f.ref, word.ref)) continue
    const text = faceOf(f, answerFace)
    if (!text || seen.has(text)) continue
    seen.add(text)
    distractors.push(text)
    if (distractors.length >= choiceCount - 1) break
  }
  const choices = shuffled(
    [{ text: correct, correct: true }, ...distractors.map((text) => ({ text, correct: false }))],
    rng,
  )
  return {
    promptFace,
    answerFace,
    prompt: faceOf(word, promptFace),
    choices,
    correctIndex: choices.findIndex((choice) => choice.correct),
  }
}

export function advanceQuestion(round, faces, poolFaces, rng, build) {
  round.state.index += 1
  round.flash = null
  round.reveal = null
  if (round.state.index >= faces.length) {
    round.done = true
    round.cleared = true
    round.state.phase = 'done'
    return true
  }
  round.state.question = build(round.state.index)
  round.state.phase = 'ask'
  return false
}

export function correctEvent(round) {
  return { life: 0, score: 0, clock: 'stop', message: '正確' }
}

export function wrongEvent(round, correctText) {
  round.reveal = { text: correctText }
  round.flash = 'wrong'
  round.state.phase = 'reveal'
  return { life: -1, score: 0, clock: 'stop', message: '錯誤' }
}

// A mode may mark `usesPool` / `usesRng` so the engine attaches the full word
// pool and rng to the round for later regeneration.
export function attach(round, usesPool, usesRng, poolFaces, rng) {
  if (usesPool) round.poolFaces = poolFaces
  if (usesRng || usesPool) round.rng = rng
}
