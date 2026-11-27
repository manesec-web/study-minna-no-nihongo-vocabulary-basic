// 濁音／促音／長音排雷 (kanatrap): show kanji + Chinese, pick the one correct
// reading out of four. Distractors are micro-perturbations of the correct kana
// (voicing toggle, っ insertion/deletion, long-vowel change) — never gibberish
// and never another legitimate reading alias of the same word.
//
// A round is QUESTIONS_PER_ROUND questions long. Every question is built the
// same way; a correct answer pauses briefly (the shell dispatches quiz.next),
// a wrong one or a timeout reveals the reading and waits for quiz.confirm, and
// both then move on. When the batch has fewer than QUESTIONS_PER_ROUND eligible
// words the pool is reshuffled and reused so a round still holds 10 questions.
import { rng01, shuffled } from './shared.js'

export const usesPool = false
export const usesRng = true

export const QUESTIONS_PER_ROUND = 10

const DAKUTEN = { か: 'が', が: 'か', き: 'ぎ', ぎ: 'き', く: 'ぐ', ぐ: 'く', け: 'げ', げ: 'け', こ: 'ご', ご: 'こ', さ: 'ざ', ざ: 'さ', し: 'じ', じ: 'し', す: 'ず', ず: 'す', せ: 'ぜ', ぜ: 'せ', そ: 'ぞ', ぞ: 'そ', た: 'だ', だ: 'た', ち: 'ぢ', ぢ: 'ち', つ: 'づ', づ: 'つ', て: 'で', で: 'て', と: 'ど', ど: 'と', は: 'ば', ば: 'は', ひ: 'び', び: 'ひ', ふ: 'ぶ', ぶ: 'ふ', へ: 'べ', べ: 'へ', ほ: 'ぼ', ぼ: 'ほ', ば: 'ぱ', ぱ: 'ば' }

const VOWELS = ['あ', 'い', 'う', 'え', 'お']

function eligibleWords(faces) {
  return faces.filter((f) => f.hasKanji && f.kana && f.zh && Array.from(f.kana).length >= 2)
}

export function eligible(faces) {
  const words = eligibleWords(faces)
  if (words.length < 2) {
    return { ok: false, reason: '需要至少 2 個「有漢字、讀音與中文」且讀音 ≥2 假名的單詞' }
  }
  return { ok: true, reason: null }
}

function perturb(chars, rng) {
  const method = Math.floor(rng01(rng) * 4)
  const out = [...chars]
  if (method === 0) {
    // Toggle voicing on a random mutable kana.
    const mutable = out.map((ch, i) => ({ ch, i })).filter((x) => DAKUTEN[x.ch])
    if (mutable.length) {
      const pick = mutable[Math.floor(rng01(rng) * mutable.length)]
      out[pick.i] = DAKUTEN[pick.ch]
      return out.join('')
    }
    // No mutable kana: fall through to an insertion perturbation instead.
    out.splice(Math.floor(rng01(rng) * (out.length + 1)), 0, 'っ')
    return out.join('')
  }
  if (method === 1) {
    // Insert っ before a random position.
    const at = Math.floor(rng01(rng) * (out.length + 1))
    out.splice(at, 0, 'っ')
    return out.join('')
  }
  if (method === 2 && out.includes('っ')) {
    // Delete a っ.
    const at = out.indexOf('っ')
    out.splice(at, 1)
    return out.join('')
  }
  // Change a vowel, or append ー when there is a long-vowel context.
  const vi = out.findIndex((ch) => VOWELS.includes(ch))
  if (vi !== -1) {
    out[vi] = VOWELS[(VOWELS.indexOf(out[vi]) + 1) % VOWELS.length]
  } else {
    out.push('ー')
  }
  return out.join('')
}

function buildQuestion(target, words, rng) {
  const correct = target.kana
  const seen = new Set([correct, ...words.map((w) => w.kana)])
  const options = [correct]
  for (let i = 0; i < 200 && options.length < 4; i += 1) {
    const candidate = perturb(Array.from(correct), rng)
    if (seen.has(candidate)) continue
    seen.add(candidate)
    options.push(candidate)
  }
  return {
    prompt: target.kanji,
    options: shuffled(options, rng),
    correct,
  }
}

// The targets of one round: every eligible word once while they last, then a
// reshuffled deck again, so a 2-word batch still plays 10 questions and a
// 12-word batch plays 10 different words.
function targetsFor(words, count, rng) {
  const targets = []
  while (targets.length < count) {
    for (const word of shuffled(words, rng)) {
      if (targets.length >= count) break
      targets.push(word)
    }
  }
  return targets
}

function showQuestion(state) {
  const question = state.questions[state.index]
  state.prompt = question.prompt
  state.options = question.options
  state.correct = question.correct
}

function advance(round) {
  const state = round.state
  round.flash = null
  round.reveal = null
  state.index += 1
  if (state.index >= state.total) {
    round.done = true
    round.cleared = true
    state.phase = 'done'
    return true
  }
  showQuestion(state)
  state.phase = 'ask'
  return false
}

export function create(round, faces, _poolFaces, rng) {
  const words = eligibleWords(faces)
  const targets = targetsFor(words, QUESTIONS_PER_ROUND, rng)
  const questions = targets.map((target) => buildQuestion(target, words, rng))
  round.state = {
    index: 0,
    total: questions.length,
    questions,
    prompt: '',
    options: [],
    correct: '',
    phase: 'ask',
  }
  showQuestion(round.state)
}

export function act(round, action) {
  const state = round.state
  if (action.type === 'choose' && state.phase === 'ask') {
    const option = state.options[action.index]
    if (!option) return { life: 0, score: 0, clock: null, message: null }
    if (option === state.correct) {
      round.streak += 1
      round.flash = null
      state.phase = 'correct'
      return { life: 0, score: 15 + round.streak * 5, clock: 'stop', message: '排雷成功' }
    }
    round.streak = 0
    round.flash = 'wrong'
    round.reveal = { text: state.correct }
    state.phase = 'reveal'
    return { life: -1, score: 0, clock: 'stop', message: '踩雷' }
  }
  if (action.type === 'next' && state.phase === 'correct') {
    const done = advance(round)
    return { life: 0, score: 0, clock: done ? 'stop' : 'start', message: null }
  }
  if (action.type === 'confirm' && state.phase === 'reveal') {
    const done = advance(round)
    return { life: 0, score: 0, clock: done ? 'stop' : 'start', message: null }
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
