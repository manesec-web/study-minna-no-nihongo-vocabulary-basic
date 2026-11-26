// 平假名尋字迷宮 (wordsearch): a real 7×7 kana grid hiding five selected words
// (straight horizontal/vertical, with non-conflicting crossings). Clues show
// only Chinese. Tap a start cell then an end cell on the same straight line.
import { rng01, shuffled } from './shared.js'

export const usesPool = false
export const usesRng = true

const SIZE = 7
const KANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'

export { SIZE }

export function arrowCell(index, key) {
  const row = Math.floor(index / SIZE)
  const col = index % SIZE
  let nr = row
  let nc = col
  if (key === 'ArrowUp') nr -= 1
  else if (key === 'ArrowDown') nr += 1
  else if (key === 'ArrowLeft') nc -= 1
  else if (key === 'ArrowRight') nc += 1
  else return index
  if (nr < 0) nr = 0
  if (nr >= SIZE) nr = SIZE - 1
  if (nc < 0) nc = 0
  if (nc >= SIZE) nc = SIZE - 1
  return nr * SIZE + nc
}

export function lineCells(start, end) {
  const sr = Math.floor(start / SIZE)
  const sc = start % SIZE
  const er = Math.floor(end / SIZE)
  const ec = end % SIZE
  if (sr !== er && sc !== ec) return null
  const cells = []
  const dr = Math.sign(er - sr)
  const dc = Math.sign(ec - sc)
  let r = sr
  let c = sc
  while (true) {
    cells.push(r * SIZE + c)
    if (r === er && c === ec) break
    r += dr
    c += dc
  }
  return cells
}

function candidateWords(faces) {
  const seen = new Set()
  const out = []
  for (const face of faces) {
    const len = Array.from(face.kana).length
    if (len < 2 || len > 7 || !face.zh) continue
    if (seen.has(face.kana)) continue
    seen.add(face.kana)
    out.push({ kana: face.kana, zh: face.zh })
  }
  return out
}

export function eligible(faces) {
  const words = candidateWords(faces)
  if (words.length < 5) {
    return { ok: false, reason: '需要至少 5 個讀音 2–7 假名且不重複的單詞' }
  }
  const layout = generate(words, () => 0.5)
  if (!layout) return { ok: false, reason: '所選單詞的讀音無法放進 7×7 直線盤' }
  return { ok: true, reason: null }
}

function place(grid, word, r, c, dir, chars) {
  const cells = []
  for (let i = 0; i < chars.length; i += 1) {
    const rr = dir === 1 ? r + i : r
    const cc = dir === 1 ? c : c + i
    if (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE) return null
    const at = rr * SIZE + cc
    if (grid[at] !== null && grid[at] !== chars[i]) return null
    cells.push(at)
  }
  let crossings = 0
  for (const at of cells) if (grid[at] !== null) crossings += 1
  if (crossings === 0 && placedCount(grid) > 0) return null
  return { cells, crossings }
}

function placedCount(grid) {
  let n = 0
  for (const cell of grid) if (cell !== null) n += 1
  return n
}

function generate(words, rng) {
  const order = shuffled(words.map((_w, i) => i), rng)
  const grid = new Array(SIZE * SIZE).fill(null)
  const placed = []

  function recurse(pos, budget) {
    if (placed.length >= 5) return true
    if (pos >= order.length || budget <= 0) return false
    const word = words[order[pos]]
    const chars = Array.from(word.kana)
    const candidates = []
    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        for (const dir of [0, 1]) {
          const fit = place(grid, word, r, c, dir, chars)
          if (fit) candidates.push({ r, c, dir, fit })
        }
      }
    }
    for (const cand of shuffled(candidates, rng)) {
      const before = grid.slice()
      for (let i = 0; i < chars.length; i += 1) {
        const rr = cand.dir === 1 ? cand.r + i : cand.r
        const cc = cand.dir === 1 ? cand.c : cand.c + i
        grid[rr * SIZE + cc] = chars[i]
      }
      placed.push({ word: order[pos], r: cand.r, c: cand.c, dir: cand.dir })
      if (recurse(pos + 1, budget - 1)) return true
      grid.splice(0, grid.length, ...before)
      placed.pop()
    }
    return recurse(pos + 1, budget)
  }

  if (!recurse(0, 2000)) return null
  for (let i = 0; i < grid.length; i += 1) {
    if (grid[i] === null) grid[i] = KANA[Math.floor(rng01(rng) * KANA.length)]
  }
  return { grid, words: placed.map((p) => words[p.word]) }
}

export function create(round, faces, _poolFaces, rng) {
  const words = candidateWords(faces)
  let layout = null
  for (let attempt = 0; attempt < 12 && !layout; attempt += 1) layout = generate(words, rng)
  round.state = {
    layout,
    found: [],
    selStart: null,
    phase: 'play',
  }
}

export function act(round, action) {
  const state = round.state
  if (state.phase !== 'play' || !state.layout) return { life: 0, score: 0, clock: null, message: null }
  if (action.type === 'tap') {
    const index = typeof action.index === 'number' ? action.index : action.value
    if (index == null) return { life: 0, score: 0, clock: null, message: null }
    if (state.selStart === null) {
      state.selStart = index
      return { life: 0, score: 0, clock: null, message: null }
    }
    if (state.selStart === index) {
      state.selStart = null
      return { life: 0, score: 0, clock: null, message: null }
    }
    const cells = lineCells(state.selStart, index)
    state.selStart = null
    if (!cells) return { life: 0, score: 0, clock: null, message: null }
    const text = cells.map((at) => state.layout.grid[at]).join('')
    for (let w = 0; w < state.layout.words.length; w += 1) {
      if (state.found.includes(w)) continue
      const kana = state.layout.words[w].kana
      if (text === kana || text === Array.from(kana).reverse().join('')) {
        state.found.push(w)
        round.streak += 1
        const done = state.found.length >= state.layout.words.length
        round.done = done
        round.cleared = done
        if (done) return { life: 0, score: 30 + round.streak * 5, clock: 'stop', message: '全部找到' }
        return { life: 0, score: 10 + round.streak * 5, clock: 'reset', message: '找到一個' }
      }
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
