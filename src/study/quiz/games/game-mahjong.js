// 單字麻將 (mahjong): overlapping layered tiles of 漢字/假名/中文. Only a tile
// with nothing above it and not sandwiched left+right at the same layer can be
// tapped into the 7-slot tray; three tiles of the same canonical word clear,
// and a triple is tried before the 7-slot limit. The generator stacks each
// word's three faces at one position across three layers in a single row, so a
// provable removal order exists: clear an end stack top → middle → bottom and
// work inward.
import { faceOf, shuffled } from './shared.js'

export const usesPool = false
export const usesRng = true

const TRAY_MAX = 7

function eligibleWords(faces) {
  return faces.filter((f) => f.hasKanji && f.kana && f.zh)
}

export function eligible(faces) {
  const words = eligibleWords(faces)
  if (words.length < 3) {
    return { ok: false, reason: '需要至少 3 個「有漢字、讀音與中文」的單詞才能湊三張同詞' }
  }
  return { ok: true, reason: null }
}

function buildBoard(round, faces, rng) {
  const words = shuffled(eligibleWords(faces), rng).slice(0, 6)
  const facesOf = ['jp', 'kana', 'zh']
  const tiles = []
  words.forEach((word, pos) => {
    for (let layer = 0; layer < 3; layer += 1) {
      tiles.push({ word: word.ref, face: facesOf[layer], layer, pos, inTray: false, cleared: false, free: false })
    }
  })
  round.state.tiles = tiles
  round.state.tray = []
  round.state.count = words.length
  round.state.phase = 'play'
  refresh(round)
}

function refresh(round) {
  const tiles = round.state.tiles
  const count = round.state.count
  tiles.forEach((tile) => {
    const above = tiles.some(
      (other) => other.pos === tile.pos && other.layer > tile.layer && !other.cleared && !other.inTray,
    )
    const left = tiles.some(
      (other) => other.pos === tile.pos - 1 && other.layer === tile.layer && !other.cleared && !other.inTray,
    )
    const right = tiles.some(
      (other) => other.pos === tile.pos + 1 && other.layer === tile.layer && !other.cleared && !other.inTray,
    )
    const sandwiched = tile.pos > 0 && tile.pos < count - 1 && left && right
    tile.free = !above && !sandwiched && !tile.cleared && !tile.inTray
  })
}

export function create(round, faces, _poolFaces, rng) {
  round.state = { tiles: [], tray: [], count: 0, phase: 'play' }
  buildBoard(round, faces, rng)
}

export function act(round, action) {
  const state = round.state
  if (state.phase !== 'play') return { life: 0, score: 0, clock: null, message: null }
  if (action.type === 'tap') {
    const tile = state.tiles[action.index]
    if (!tile || tile.cleared || tile.inTray || !tile.free) {
      return { life: 0, score: 0, clock: null, message: null }
    }
    tile.inTray = true
    tile.free = false
    state.tray.push(action.index)
    refresh(round)

    // Try a triple first, before enforcing the tray limit.
    const counts = new Map()
    for (const index of state.tray) {
      const t = state.tiles[index]
      counts.set(t.word, (counts.get(t.word) ?? 0) + 1)
    }
    let tripled = false
    for (const [word, count] of counts.entries()) {
      if (count >= 3) {
        const trio = state.tray.filter((index) => state.tiles[index].word === word).slice(0, 3)
        for (const index of trio) {
          state.tiles[index].cleared = true
          state.tiles[index].inTray = false
        }
        state.tray = state.tray.filter((index) => !trio.includes(index))
        tripled = true
        break
      }
    }
    refresh(round)
    if (tripled) {
      round.streak += 1
      const done = state.tiles.every((t) => t.cleared)
      round.done = done
      round.cleared = done
      if (done) return { life: 0, score: 30 + round.streak * 5, clock: 'stop', message: '清空' }
      return { life: 0, score: 10 + round.streak * 5, clock: 'reset', message: '三消' }
    }
    if (state.tray.length >= TRAY_MAX) {
      round.done = true
      round.cleared = false
      state.phase = 'done'
      return { life: -1, score: 0, clock: 'stop', message: '托盤滿了' }
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
