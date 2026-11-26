// 去漢字盲測 (nokanji): the prompt is only the hiragana reading (katakana
// transcribed, never invented), never the kanji; the player picks the Chinese.
import { advanceQuestion, mcQuestion, wrongEvent } from './shared.js'

export const usesPool = true
export const usesRng = false

export function eligible(faces) {
  if (faces.length === 0) return { ok: false, reason: '沒有選取單詞' }
  if (!faces.some((f) => f.kana)) return { ok: false, reason: '沒有可用的讀音' }
  return { ok: true, reason: null }
}

function buildQuestion(round, faces, poolFaces, rng, index) {
  round.state.question = mcQuestion(faces[index], poolFaces, rng, 'kana', 'zh', 5)
}

export function create(round, faces, poolFaces, rng) {
  round.state = { index: 0, phase: 'ask', question: null }
  buildQuestion(round, faces, poolFaces, rng, 0)
}

export function act(round, action) {
  const state = round.state
  if (action.type === 'choose' && state.phase === 'ask') {
    const choice = state.question?.choices?.[action.index]
    if (!choice) return { life: 0, score: 0, clock: null, message: null }
    if (choice.correct) {
      round.streak += 1
      round.flash = null
      state.phase = 'correct'
      return { life: 0, score: 10 + round.streak, clock: 'stop', message: '正確' }
    }
    round.streak = 0
    return wrongEvent(round, state.question.choices[state.question.correctIndex]?.text)
  }
  if (action.type === 'next' && state.phase === 'correct') {
    const done = advanceQuestion(round, round.faces, round.poolFaces, round.rng, (i) =>
      buildQuestion(round, round.faces, round.poolFaces, round.rng, i),
    )
    return { life: 0, score: 0, clock: done ? 'stop' : 'start', message: null }
  }
  if (action.type === 'confirm' && state.phase === 'reveal') {
    const done = advanceQuestion(round, round.faces, round.poolFaces, round.rng, (i) =>
      buildQuestion(round, round.faces, round.poolFaces, round.rng, i),
    )
    return { life: 0, score: 0, clock: done ? 'stop' : 'start', message: null }
  }
  if (action.type === 'timeout' && state.phase === 'ask') {
    round.streak = 0
    return wrongEvent(round, state.question.choices[state.question.correctIndex]?.text)
  }
  return { life: 0, score: 0, clock: null, message: null }
}
