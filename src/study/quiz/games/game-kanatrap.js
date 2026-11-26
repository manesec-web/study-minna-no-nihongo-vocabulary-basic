// 濁音／促音／長音排雷 (kanatrap): show kanji + Chinese, pick the one correct
// reading out of four. Distractors are micro-perturbations of the correct kana
// (voicing toggle, っ insertion/deletion, long-vowel change) — never gibberish
// and never another legitimate reading alias of the same word.
import { faceOf, rng01, shuffled } from './shared.js'

export const usesPool = false
export const usesRng = true

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

export function create(round, faces, _poolFaces, rng) {
  const words = eligibleWords(faces)
  const target = shuffled(words, rng)[0]
  const correct = target.kana
  const seen = new Set([correct, ...words.map((w) => w.kana)])
  const options = [correct]
  for (let i = 0; i < 200 && options.length < 4; i += 1) {
    const candidate = perturb(Array.from(correct), rng)
    if (seen.has(candidate)) continue
    seen.add(candidate)
    options.push(candidate)
  }
  round.state = {
    prompt: target.kanji,
    promptZh: target.zh,
    options: shuffled(options, rng),
    correct,
    phase: 'ask',
  }
}

export function act(round, action) {
  const state = round.state
  if (action.type === 'choose' && state.phase === 'ask') {
    const option = state.options[action.index]
    if (!option) return { life: 0, score: 0, clock: null, message: null }
    if (option === state.correct) {
      round.streak += 1
      round.flash = null
      round.done = true
      round.cleared = true
      state.phase = 'done'
      return { life: 0, score: 15 + round.streak * 5, clock: 'stop', message: '排雷成功' }
    }
    round.streak = 0
    round.flash = 'wrong'
    round.reveal = { text: state.correct }
    state.phase = 'reveal'
    return { life: -1, score: 0, clock: 'stop', message: '踩雷' }
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
    round.reveal = { text: state.correct }
    state.phase = 'reveal'
    return { life: -1, score: 0, clock: 'stop', message: '時間到' }
  }
  return { life: 0, score: 0, clock: null, message: null }
}
