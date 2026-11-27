// 單字麻將 (mahjong): overlapping layered tiles of 漢字/假名/中文. Only a tile
// with nothing above it and not sandwiched left+right at the same layer can be
// tapped into the 7-slot tray; three tiles of the same canonical word clear,
// and a triple is tried before the 7-slot limit.
//
// The board is a 羊了個羊-style pile: a three-layer pyramid whose odd layers
// sit over the 2×2 junctions of the layer below, with taller piles on the top
// corners. Geometry lives in board units (one unit = one tile width) and the
// view maps it to percentages, so the tiles scale with the play area.
//
// Solvability is by construction. `solutionOrder` sweeps the pile layer by
// layer from the top, each layer row by row from the left: by then nothing is
// left above a tile, and the leftmost remaining tile of a row is never
// sandwiched. Triples are dealt along that sweep in an A B C A B C A B C
// pattern, so along the solution the tray holds at most six tiles plus the
// seventh that completes a triple (which is tried before the limit).
import { shuffled } from './shared.js'

export const usesPool = false
export const usesRng = true

const TRAY_MAX = 7

// Board units. `peek` lifts every higher layer so the tile under it shows a
// strip below; `side` reserves room for the 3D side drawn by the view.
export const MAHJONG_LAYOUT = {
  tileW: 1,
  tileH: 1.3,
  gap: 0.06,
  peek: 0.36,
  side: 0.08,
}

const PITCH_X = MAHJONG_LAYOUT.tileW + MAHJONG_LAYOUT.gap
const PITCH_Y = MAHJONG_LAYOUT.tileH + MAHJONG_LAYOUT.gap
// Two rectangles overlap when they share at least this much on both axes, so
// tiles that merely touch across the gap never count as stacked.
const MIN_OVERLAP = 0.04

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

// The pile for a batch: base columns × rows, then two inset layers (odd layers
// over the junctions), plus the corner piles. Every shape holds a multiple of
// three tiles so whole words can be dealt.
function shapeFor(wordCount) {
  if (wordCount >= 7) {
    return {
      layers: [
        { inset: 0, cols: 6, rows: 4 },
        { inset: 0.5, cols: 5, rows: 3 },
        { inset: 1, cols: 3, rows: 3 },
      ],
      // [col, row, [extra layers], chain] on the base grid: tall top corners
      // (chains: they settle up as they empty) and two-high bottom corners.
      piles: [
        [0, 0, [2, 3], true],
        [5, 0, [2, 3], true],
        [0, 3, [2], false],
        [5, 3, [2], false],
      ],
    }
  }
  if (wordCount >= 5) {
    return {
      layers: [
        { inset: 0, cols: 5, rows: 3 },
        { inset: 0.5, cols: 4, rows: 2 },
        { inset: 1, cols: 3, rows: 1 },
      ],
      piles: [
        [0, 0, [2, 3], true],
        [4, 0, [2, 3], true],
      ],
    }
  }
  return {
    layers: [
      { inset: 0, cols: 4, rows: 3 },
      { inset: 0.5, cols: 3, rows: 2 },
      { inset: 1, cols: 2, rows: 1 },
    ],
    piles: [
      [0, 0, [2, 3], true],
      [3, 0, [2, 3], true],
    ],
  }
}

// Every slot of the pile in solution order: layer by layer from the top, then
// row by row from the top, then left to right. A corner pile is a `chain`:
// its base tile belongs to it and the pile settles up as it empties.
function slotsFor(shape) {
  const slots = []
  shape.layers.forEach((layer, index) => {
    for (let row = 0; row < layer.rows; row += 1) {
      for (let col = 0; col < layer.cols; col += 1) {
        slots.push({ layer: index, col: layer.inset + col, row: layer.inset + row, chain: false })
      }
    }
  })
  for (const [col, row, layers, chain] of shape.piles) {
    for (const layer of layers) slots.push({ layer, col, row, chain })
  }
  for (const slot of slots) {
    if (slot.layer !== 0) continue
    if (shape.piles.some(([col, row, _layers, chain]) => chain && col === slot.col && row === slot.row)) {
      slot.chain = true
    }
  }
  slots.sort((a, b) => b.layer - a.layer || a.row - b.row || a.col - b.col)
  return slots
}

// The word and face of each slot. The sweep is chunked from the top: nine
// slots cycle three words (A B C A B C A B C), a last tail of six cycles two
// and a tail of three is one word, so every triple is dealt whole and, along
// the solution, the tray never holds more than six tiles plus the one that
// completes a triple. A triple's three tiles take the three faces in deal
// order, in a per-triple shuffled order.
function dealWords(slotCount, words, rng) {
  const tripleCount = slotCount / 3
  const triples = []
  while (triples.length < tripleCount) {
    for (const word of shuffled(words, rng)) {
      if (triples.length >= tripleCount) break
      triples.push(word)
    }
  }
  const facesOf = ['jp', 'kana', 'zh']
  const faceOrder = triples.map(() => shuffled(facesOf, rng))
  const dealt = triples.map(() => 0)
  return Array.from({ length: slotCount }, (_v, position) => {
    const chunkStart = Math.floor(position / 9) * 9
    const remaining = slotCount - chunkStart
    const inChunk = position - chunkStart
    const offset = remaining >= 9 ? inChunk % 3 : remaining >= 6 ? inChunk % 2 : 0
    const tripleIndex = chunkStart / 3 + offset
    const face = faceOrder[tripleIndex][dealt[tripleIndex] % 3]
    dealt[tripleIndex] += 1
    return { word: triples[tripleIndex], face }
  })
}

function rect(tile) {
  return {
    x: tile.col * PITCH_X,
    y: tile.row * PITCH_Y - tile.drawLayer * MAHJONG_LAYOUT.peek,
    w: MAHJONG_LAYOUT.tileW,
    h: MAHJONG_LAYOUT.tileH,
  }
}

function overlaps(a, b) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return w > MIN_OVERLAP && h > MIN_OVERLAP
}

function onBoard(tile) {
  return !tile.cleared && !tile.inTray
}

function refresh(round) {
  const state = round.state
  const tiles = state.tiles
  for (const tile of tiles) tile.drawLayer = tile.layer

  // Corner piles settle up: the top remaining tile keeps the pile's top
  // position, each one under it a peek lower. Only chains collapse — a
  // pyramid tile never moves, like 羊了個羊, since a tile above it in the same
  // layer would then be overlapped without covering it.
  const chains = new Map()
  for (const tile of tiles) {
    if (!tile.chain || !onBoard(tile)) continue
    const key = `${tile.col},${tile.row}`
    const list = chains.get(key) ?? []
    list.push(tile)
    chains.set(key, list)
  }
  for (const list of chains.values()) {
    list.sort((a, b) => b.layer - a.layer)
    list.forEach((tile, index) => {
      tile.drawLayer = tile.chainTop - index
    })
  }

  for (const tile of tiles) {
    if (!onBoard(tile)) {
      tile.free = false
      continue
    }
    const mine = rect(tile)
    const covered = tiles.some((other) => other !== tile && other.layer > tile.layer && onBoard(other) && overlaps(rect(other), mine))
    const left = tiles.some((other) => other !== tile && other.layer === tile.layer && other.row === tile.row && other.col === tile.col - 1 && onBoard(other))
    const right = tiles.some((other) => other !== tile && other.layer === tile.layer && other.row === tile.row && other.col === tile.col + 1 && onBoard(other))
    tile.free = !covered && !(left && right)
  }
}

// The provable removal order for the current board: sweep the pile top-down,
// rows from the left. Tiles already cleared or in the tray are skipped.
export function solutionOrder(state) {
  return state.tiles
    .map((tile, index) => ({ tile, index }))
    .filter(({ tile }) => onBoard(tile))
    .sort((a, b) => b.tile.layer - a.tile.layer || a.tile.row - b.tile.row || a.tile.col - b.tile.col)
    .map(({ index }) => index)
}

function buildBoard(round, faces, rng) {
  const words = eligibleWords(faces)
  const shape = shapeFor(words.length)
  const slots = slotsFor(shape)
  const dealt = dealWords(slots.length, words, rng)
  const chainTops = new Map()
  for (const slot of slots) {
    if (!slot.chain) continue
    const key = `${slot.col},${slot.row}`
    chainTops.set(key, Math.max(chainTops.get(key) ?? 0, slot.layer))
  }
  const tiles = slots.map((slot, index) => ({
    word: dealt[index].word.ref,
    face: dealt[index].face,
    layer: slot.layer,
    col: slot.col,
    row: slot.row,
    chain: Boolean(slot.chain),
    chainTop: chainTops.get(`${slot.col},${slot.row}`) ?? slot.layer,
    drawLayer: slot.layer,
    inTray: false,
    cleared: false,
    free: false,
  }))
  round.state.tiles = tiles
  round.state.tray = []
  round.state.count = words.length
  round.state.layers = shape.layers.length + 1
  refresh(round)

  // The board box is measured once over every tile's start position, so the
  // pile keeps its footprint as it empties.
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const tile of tiles) {
    const r = rect(tile)
    minX = Math.min(minX, r.x)
    minY = Math.min(minY, r.y)
    maxX = Math.max(maxX, r.x + r.w)
    maxY = Math.max(maxY, r.y + r.h)
  }
  round.state.board = {
    offsetX: minX,
    offsetY: minY,
    width: maxX - minX + MAHJONG_LAYOUT.side,
    height: maxY - minY + MAHJONG_LAYOUT.side,
    tileW: MAHJONG_LAYOUT.tileW,
    tileH: MAHJONG_LAYOUT.tileH,
  }
  round.state.phase = 'play'
}

export function create(round, faces, _poolFaces, rng) {
  round.state = { tiles: [], tray: [], count: 0, phase: 'play' }
  buildBoard(round, faces, rng)
}

// The pile box's height as a percentage of its width. The view sets it as
// `padding-top` rather than `aspect-ratio`, so the box keeps its height in a
// browser that ignores aspect-ratio (the tiles are positioned by percentage of
// this box; a collapsed box would stack them in one row).
export function boardRatio(state) {
  const board = state.board
  return (board.height / board.width) * 100
}

// Screen-space helpers for the view (pure; the view only formats them).
export function tileRect(state, tile) {
  const r = rect(tile)
  const board = state.board
  return {
    left: ((r.x - board.offsetX) / board.width) * 100,
    top: ((r.y - board.offsetY) / board.height) * 100,
    width: (r.w / board.width) * 100,
    height: (r.h / board.height) * 100,
  }
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

