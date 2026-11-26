// 三元消消樂 (trimatch): only words that genuinely separate a kanji written
// form from a different kana reading (and have a Chinese meaning) qualify. Three
// sub-variants cycle via the in-mode toggle: 三張同配 / 看漢字選讀音 / 看讀音選漢字.
import { faceOf, pick, rng01, shuffled } from './shared.js'

export const usesPool = false
export const usesRng = true

const VARIANTS = ['triple', 'kanji-reading', 'reading-kanji']

function eligibleWords(faces) {
  return faces.filter((f) => f.hasKanji && f.kana && f.kanji && f.kana !== f.kanji && f.zh)
}

export function eligible(faces) {
  const words = eligibleWords(faces)
  if (words.length < 2) {
    return { ok: false, reason: '需要至少 2 個「有漢字、讀音與漢字不同、且有中文」的單詞' }
  }
  const distinctKana = new Set(words.map((w) => w.kana)).size
  const distinctKanji = new Set(words.map((w) => w.kanji)).size
  if (distinctKana < 2 || distinctKanji < 2) {
    return { ok: false, reason: '合格單詞的讀音或漢字不夠多樣，無法產生可區分的選項' }
  }
  return { ok: true, reason: null }
}

function buildTriple(round, faces, rng) {
  const words = shuffled(eligibleWords(faces), rng).slice(0, 3)
  const cards = []
  for (const word of words) {
    cards.push({ ref: word.ref, face: 'jp' })
    cards.push({ ref: word.ref, face: 'kana' })
    cards.push({ ref: word.ref, face: 'zh' })
  }
  round.state.cards = shuffled(cards, rng)
  round.state.selected = []
  round.state.phase = 'play'
}

function buildPick(round, faces, rng, promptFace, answerFace) {
  const words = eligibleWords(faces)
  const target = shuffled(words, rng)[0]
  const correct = faceOf(target, answerFace)
  const seen = new Set([correct])
  const options = [correct]
  for (const other of shuffled(words, rng)) {
    if (other.ref === target.ref) continue
    const text = faceOf(other, answerFace)
    if (!text || seen.has(text)) continue
    seen.add(text)
    options.push(text)
    if (options.length >= 8) break
  }
  round.state.promptFace = promptFace
  round.state.answerFace = answerFace
  round.state.prompt = faceOf(target, promptFace)
  round.state.promptZh = target.zh
  round.state.options = shuffled(options, rng)
  round.state.correct = correct
  round.state.phase = 'ask'
}

export function create(round, faces, _poolFaces, rng) {
  round.state = { variant: 'triple', cards: [], selected: [], phase: 'play' }
  buildTriple(round, faces, rng)
}

export function act(round, action) {
  const state = round.state
  if (action.type === 'toggle') {
    const index = (VARIANTS.indexOf(state.variant) + 1) % VARIANTS.length
    state.variant = VARIANTS[index]
    if (state.variant === 'triple') buildTriple(round, round.faces, round.rng)
    else if (state.variant === 'kanji-reading') buildPick(round, round.faces, round.rng, 'jp', 'kana')
    else buildPick(round, round.faces, round.rng, 'kana', 'jp')
    return { life: 0, score: 0, clock: null, message: null }
  }

  if (state.variant === 'triple') {
    return actTriple(round, action)
  }
  return actPick(round, action)
}

function actTriple(round, action) {
  const state = round.state
  if (action.type === 'tap') {
    const card = state.cards[action.index]
    if (!card || card.cleared) return { life: 0, score: 0, clock: null, message: null }
    const already = state.selected.indexOf(action.index)
    if (already !== -1) {
      card.selected = false
      state.selected.splice(already, 1)
      return { life: 0, score: 0, clock: null, message: null }
    }
    card.selected = true
    state.selected.push(action.index)
    if (state.selected.length < 3) return { life: 0, score: 0, clock: null, message: null }
    const [a, b, c] = state.selected.map((i) => state.cards[i])
    const match = a.ref === b.ref && b.ref === c.ref
    if (match) {
      for (const i of state.selected) state.cards[i].cleared = true
      round.streak += 1
      const done = state.cards.every((card) => card.cleared)
      round.done = done
      round.cleared = done
      state.selected = []
      round.flash = null
      if (done) return { life: 0, score: 30 + round.streak * 5, clock: 'stop', message: '完成' }
      return { life: 0, score: 15 + round.streak * 5, clock: 'reset', message: '消除一組' }
    }
    for (const i of state.selected) state.cards[i].selected = false
    state.selected = []
    round.streak = 0
    round.flash = 'wrong'
    return { life: -1, score: 0, clock: null, message: '不是同一詞' }
  }
  if (action.type === 'timeout') {
    round.done = true
    round.cleared = false
    return { life: 0, score: 0, clock: 'stop', message: '時間到' }
  }
  return { life: 0, score: 0, clock: null, message: null }
}

function actPick(round, action) {
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
      return { life: 0, score: 20 + round.streak * 5, clock: 'stop', message: '正確' }
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
