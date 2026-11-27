// 單字隕石防禦 (falling): Japanese meteors fall; the player fires the matching
// Chinese cannon. The view drives the fall with a 'tick' action and must stop
// ticking on unmount/pause. Missing the meteor or landing it costs a life.
import { pick, rng01, shuffled } from './shared.js'

export const usesPool = false
export const usesRng = true

export function eligible(faces) {
  const distinctZh = new Set(faces.map((f) => f.zh).filter(Boolean)).size
  if (faces.length < 2 || distinctZh < 2) {
    return { ok: false, reason: '需要至少 2 個不同中文意思的單詞才能產生砲台' }
  }
  return { ok: true, reason: null }
}

function spawnMeteor(round, faces, rng) {
  const state = round.state
  state.wrongIndex = null
  if (state.position >= state.total) {
    round.done = true
    round.cleared = state.hit >= state.total
    state.phase = 'done'
    return false
  }
  const word = state.words[state.position]
  state.position += 1
  const promptFace = pick(['jp', 'kana'], rng)
  state.meteor = { word, face: promptFace, y: 0, lane: Math.floor(rng01(rng) * 5) }
  const correct = faces[word].zh
  const seen = new Set([correct])
  const cannons = [{ word, zh: correct }]
  for (const other of shuffled(faces, rng)) {
    if (other.zh === correct || seen.has(other.zh)) continue
    seen.add(other.zh)
    cannons.push({ word: faces.indexOf(other), zh: other.zh })
    if (cannons.length >= 6) break
  }
  state.cannons = shuffled(cannons, rng)
  return true
}

export function create(round, faces, _poolFaces, rng) {
  round.state = {
    words: shuffled(faces.map((_f, at) => at), rng),
    position: 0,
    total: faces.length,
    hit: 0,
    meteor: null,
    cannons: [],
    wrongIndex: null,
    phase: 'play',
  }
  spawnMeteor(round, faces, rng)
}

export function act(round, action) {
  const state = round.state
  if (state.phase !== 'play') return { life: 0, score: 0, clock: null, message: null }
  if (action.type === 'shoot') {
    const cannon = state.cannons[action.index]
    if (!cannon || !state.meteor) return { life: 0, score: 0, clock: null, message: null }
    if (cannon.word === state.meteor.word) {
      state.hit += 1
      round.streak += 1
      round.flash = null
      const spawned = spawnMeteor(round, round.faces, round.rng)
      if (!spawned) {
        return { life: 0, score: 15 + round.streak, clock: 'stop', message: round.cleared ? '防禦成功' : '防禦結束' }
      }
      return { life: 0, score: 10 + round.streak, clock: 'reset', message: '擊落' }
    }
    round.streak = 0
    round.flash = 'wrong'
    state.wrongIndex = action.index
    return { life: -1, score: 0, clock: null, message: '打錯砲台' }
  }
  if (action.type === 'tick') {
    if (!state.meteor) return { life: 0, score: 0, clock: null, message: null }
    state.meteor.y += 8
    if (state.meteor.y >= 100) {
      round.streak = 0
      round.flash = 'wrong'
      const spawned = spawnMeteor(round, round.faces, round.rng)
      if (!spawned) {
        return { life: -1, score: 0, clock: 'stop', message: round.cleared ? '防禦成功' : '防禦結束' }
      }
      return { life: -1, score: 0, clock: null, message: '隕石落地' }
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
