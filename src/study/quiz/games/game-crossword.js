// 迷你十字填字 (crossword): a real, connected crossword built from 4–6 words
// that share kana. The generator is bounded and backtracking, never loops
// forever, and rejects disconnected or conflicting layouts.
import { rng01, shuffled } from './shared.js'

export const usesPool = false
export const usesRng = true

export const CROSSWORD_KANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽっゃゅょー'

function mulberry(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

export function eligible(faces) {
  const words = candidateWords(faces)
  if (words.length < 4) return { ok: false, reason: '需要至少 4 個讀音 2–6 假名且不重複的單詞' }
  // Varying seeds so the 400-attempt search is not four identical shuffles.
  for (const seed of [1, 2, 3, 5, 8, 13, 21, 34]) {
    if (generate(words, mulberry(seed))) return { ok: true, reason: null }
  }
  return { ok: false, reason: '所選單詞的讀音沒有足夠共用假名，無法交叉成填字盤' }
}

function candidateWords(faces) {
  const seen = new Set()
  const out = []
  for (const face of faces) {
    const chars = Array.from(face.kana)
    if (chars.length < 2 || chars.length > 6) continue
    if (!face.zh || seen.has(face.kana)) continue
    seen.add(face.kana)
    out.push({ kana: face.kana, zh: face.zh })
  }
  return out
}

// Placement geometry. `cells` are [row, col] pairs for the run; `crossings` is
// the number of existing cells the run touches.
function placementCells(word, row, col, dir) {
  const chars = Array.from(word.kana)
  const cells = []
  for (let i = 0; i < chars.length; i += 1) {
    const r = dir === 1 ? row + i : row
    const c = dir === 1 ? col : col + i
    // Negative coordinates are allowed here and renormalised in finalize().
    // Rejecting them prevented any word from growing above or left of the
    // first placement, so typical verbs that share a trailing ます could
    // never form a board.
    cells.push([r, c])
  }
  return cells
}

function covers(placement, words, r, c) {
  const word = words[placement.word]
  const len = Array.from(word.kana).length
  if (placement.dir === 0) return placement.row === r && c >= placement.col && c < placement.col + len
  return placement.col === c && r >= placement.row && r < placement.row + len
}

function fits(grid, words, word, row, col, dir) {
  const chars = Array.from(word.kana)
  const cells = placementCells(word, row, col, dir)
  if (!cells) return null
  let crossings = 0
  for (let i = 0; i < cells.length; i += 1) {
    const [r, c] = cells[i]
    const key = `${r},${c}`
    if (grid.cells.has(key)) {
      if (grid.cells.get(key) !== chars[i]) return null
      crossings += 1
      // A crossing must be perpendicular: collinear overlap with a same-
      // direction word is not a real intersection.
      const collinear = grid.placed.some((p) => p.dir === dir && covers(p, words, r, c))
      if (collinear) return null
    }
    // No adjacent parallel words: a cell beside the run (not on the run) may
    // only be occupied by a perpendicular word, never a parallel one.
    const beside = dir === 1
      ? [[r, c - 1], [r, c + 1]]
      : [[r - 1, c], [r + 1, c]]
    for (const [br, bc] of beside) {
      const bkey = `${br},${bc}`
      const onRun = cells.some(([rr, cc]) => rr === br && cc === bc)
      if (onRun || !grid.cells.has(bkey)) continue
      const parallel = grid.placed.some((p) => p.dir === dir && covers(p, words, br, bc))
      if (parallel) return null
    }
  }
  if (crossings === 0 && grid.placed.length > 0) return null
  return { cells, crossings }
}

function generate(words, rng) {
  const target = Math.min(6, words.length)
  // Monte Carlo search: each attempt shuffles the full word order and tries to
  // build a connected layout around the first word. Bounded, so a hard set
  // fails cleanly.
  for (let attemptIndex = 0; attemptIndex < 400; attemptIndex += 1) {
    const order = shuffled(words.map((_w, i) => i), rng)
    const first = order[0]
    const grid = { cells: new Map(), placed: [] }
    const firstChars = Array.from(words[first].kana)
    firstChars.forEach((ch, i) => grid.cells.set(`0,${i}`, ch))
    grid.placed.push({ word: first, row: 0, col: 0, dir: 0 })
    const layout = attempt(order, grid, words, target, rng)
    if (layout) return layout
  }
  return null
}

function attempt(order, grid, words, target, rng) {
  function recurse(pos, budget) {
    if (grid.placed.length >= target) return true
    // Prefer up to 6 words, but a connected 4-word board is already playable.
    if (pos >= order.length || budget <= 0) return grid.placed.length >= 4
    const wordIndex = order[pos]
    const word = words[wordIndex]
    const chars = Array.from(word.kana)
    const anchorByChar = new Map()
    for (const [key, ch] of grid.cells.entries()) {
      const [r, c] = key.split(',').map(Number)
      if (!anchorByChar.has(ch)) anchorByChar.set(ch, [])
      anchorByChar.get(ch).push([r, c])
    }
    const candidates = []
    for (let ci = 0; ci < chars.length; ci += 1) {
      for (const [r, c] of anchorByChar.get(chars[ci]) ?? []) {
        for (const dir of [0, 1]) {
          const row = dir === 1 ? r - ci : r
          const col = dir === 1 ? c : c - ci
          const fit = fits(grid, words, word, row, col, dir)
          if (fit) candidates.push({ row, col, dir, fit })
        }
      }
    }
    for (const candidate of shuffled(candidates, rng)) {
      const cellsBefore = new Map(grid.cells)
      const placedBefore = grid.placed.slice()
      for (let i = 0; i < candidate.fit.cells.length; i += 1) {
        grid.cells.set(`${candidate.fit.cells[i][0]},${candidate.fit.cells[i][1]}`, chars[i])
      }
      grid.placed.push({ word: wordIndex, row: candidate.row, col: candidate.col, dir: candidate.dir })
      if (recurse(pos + 1, budget - 1)) return true
      grid.cells = cellsBefore
      grid.placed = placedBefore
    }
    return recurse(pos + 1, budget)
  }
  if (!recurse(1, 2000)) return null
  return finalize(grid, words)
}

function finalize(grid, words) {
  let minRow = Infinity
  let maxRow = -Infinity
  let minCol = Infinity
  let maxCol = -Infinity
  for (const key of grid.cells.keys()) {
    const [r, c] = key.split(',').map(Number)
    if (r < minRow) minRow = r
    if (r > maxRow) maxRow = r
    if (c < minCol) minCol = c
    if (c > maxCol) maxCol = c
  }
  const rows = maxRow - minRow + 1
  const cols = maxCol - minCol + 1
  const cells = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ char: '', words: [] })),
  )
  for (const [key, ch] of grid.cells.entries()) {
    const [r, c] = key.split(',').map(Number)
    cells[r - minRow][c - minCol].char = ch
  }
  // Remap placement word ids onto the packed layout.words array so hints
  // can read layout.words[cell.words[i]] without going out of range.
  const placedWords = grid.placed.map((p) => words[p.word])
  const remap = new Map(grid.placed.map((p, i) => [p.word, i]))
  for (const p of grid.placed) {
    const word = words[p.word]
    const chars = Array.from(word.kana)
    for (let i = 0; i < chars.length; i += 1) {
      const r = (p.dir === 1 ? p.row + i : p.row) - minRow
      const c = (p.dir === 1 ? p.col : p.col + i) - minCol
      cells[r][c].words.push(remap.get(p.word))
    }
  }
  return {
    cells,
    words: placedWords,
    placements: grid.placed.map((p, i) => ({
      word: i,
      row: p.row - minRow,
      col: p.col - minCol,
      dir: p.dir,
      length: Array.from(words[p.word].kana).length,
    })),
  }
}

// Two same-direction words are "adjacent parallel" when they run side by side
// with overlapping extent (a real crossword forbids this).
export function hasAdjacentParallel(layout) {
  const placements = layout?.placements ?? []
  for (let i = 0; i < placements.length; i += 1) {
    for (let j = i + 1; j < placements.length; j += 1) {
      const a = placements[i]
      const b = placements[j]
      if (a.dir !== b.dir) continue
      if (a.dir === 0) {
        if (Math.abs(a.row - b.row) !== 1) continue
        const overlap = Math.max(0, Math.min(a.col + a.length, b.col + b.length) - Math.max(a.col, b.col))
        if (overlap > 0) return true
      } else {
        if (Math.abs(a.col - b.col) !== 1) continue
        const overlap = Math.max(0, Math.min(a.row + a.length, b.row + b.length) - Math.max(a.row, b.row))
        if (overlap > 0) return true
      }
    }
  }
  return false
}

export function create(round, faces, _poolFaces, rng) {
  const words = candidateWords(faces)
  let layout = null
  for (let attempt = 0; attempt < 12 && !layout; attempt += 1) {
    layout = generate(words, rng)
  }
  // A constant or unlucky rng can repeat the same shuffle 12 times.
  // Fall back to a fresh stream so a crossable set still gets a board.
  if (!layout) {
    for (const seed of [1, 2, 3, 5, 8, 13, 21, 34]) {
      layout = generate(words, mulberry(seed))
      if (layout) break
    }
  }
  round.state = {
    layout,
    selected: null,
    phase: 'play',
  }
}

export function act(round, action) {
  const state = round.state
  if (state.phase !== 'play') return { life: 0, score: 0, clock: null, message: null }
  if (action.type === 'tap' && action.value) {
    state.selected = { row: action.value.row, col: action.value.col }
    return { life: 0, score: 0, clock: null, message: null }
  }
  if (action.type === 'input' && typeof action.value === 'string' && state.selected && state.layout) {
    const cell = state.layout.cells[state.selected.row][state.selected.col]
    if (cell && cell.char) {
      cell.filled = action.value
      cell.correct = action.value === cell.char
    }
    return { life: 0, score: 0, clock: null, message: null }
  }
  if (action.type === 'backspace' && state.selected && state.layout) {
    const cell = state.layout.cells[state.selected.row][state.selected.col]
    if (cell) {
      cell.filled = null
      cell.correct = false
    }
    return { life: 0, score: 0, clock: null, message: null }
  }
  if (action.type === 'check' && state.layout) {
    const complete = state.layout.cells.every((row) =>
      row.every((cell) => !cell.char || cell.filled === cell.char),
    )
    if (complete) {
      round.done = true
      round.cleared = true
      state.phase = 'done'
      return { life: 0, score: 60, clock: 'stop', message: '完成' }
    }
    round.flash = 'wrong'
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
