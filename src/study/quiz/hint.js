// Quiz hint timing + effects. Pure rules: `hintRule` says when a mode is
// actionable and names the "question / board" key that resets the 10s hint
// clock, and `applyHint` computes the per-mode visual hint. Neither touches the
// DOM; the command layer stores the result on `round.hint` / `round.hintEffect`
// and the views only read those two fields.
//
// The hint clock is separate from the quiz time limit. It always uses
// HINT_DELAY_MS of continuous actionable time, reset when the question changes
// (a new question, a refilled board, a new target, or a new group). Held
// clocks that do not offer a tap (pairs peek, match3 drop-in, memory deal +
// countdown, whack 2s downtime, and the other reveal locks) are treated as
// non-actionable, so they neither start nor advance the 10s.
import { faceOf } from './faces.js'
import { findConnectPath, findMatch3Group } from './engine.js'
import { SIZE } from './games/game-wordsearch.js'

export const HINT_DELAY_MS = 10000

function countAliveConnect(state) {
  return (state.cells ?? []).filter((cell) => !cell.cleared).length
}

function countClearedMahjong(state) {
  return (state.tiles ?? []).filter((tile) => tile.cleared).length
}

// Four question-family modes are single-shot: the round has exactly one answer.
// Time resets only when a fresh round begins, so a stable key is correct.
function keyFor(mode, state) {
  switch (mode) {
    case 'choice':
    case 'boss':
    case 'nokanji':
    case 'fillblank':
    case 'spell':
    case 'kanatrap':
      return `${mode}:${state?.index ?? 0}`
    case 'oddone':
      return `oddone:${state?.played ?? 0}`
    case 'swipe':
      return `swipe:${state?.position ?? 0}`
    case 'memory':
      return `memory:${state?.groupIndex ?? 0}`
    case 'match3':
      return `match3:${state?.clearCount ?? 0}`
    case 'connect':
      return `connect:${countAliveConnect(state)}`
    case 'reaction':
      return `reaction:${state?.target?.word ?? 0}`
    case 'falling':
    case 'sushi':
    case 'snake':
      return `${mode}:${state?.position ?? 0}`
    case 'whack':
      return `whack:${state?.turn ?? 0}`
    case 'mahjong':
      return `mahjong:${countClearedMahjong(state)}`
    case 'wordsearch':
      return `wordsearch:${(state?.found ?? []).length}`
    case 'columns':
    case 'pairs':
    case 'wordle':
    case 'crossword':
    case 'hangman':
      return `${mode}:board`
    case 'spottypo':
      return `${mode}:q`
    default:
      return `${mode}:board`
  }
}

function activeFor(mode, state, done) {
  if (done) return false
  const phase = state?.phase
  switch (mode) {
    case 'choice':
    case 'boss':
    case 'nokanji':
    case 'oddone':
    case 'fillblank':
    case 'kanatrap':
    case 'spell':
    case 'spottypo':
      return phase === 'ask'
    case 'swipe':
      return phase === 'ask' && !state?.resolved
    case 'pairs':
      return !state?.locked && !state?.peek
    case 'match3':
      return phase === 'play' && !state?.locked
    case 'connect':
      return !state?.locked
    case 'memory':
      return phase === 'ask'
    case 'columns':
    case 'reaction':
      return true
    case 'crossword':
      // 迷你填字 never shows the 10s hint button.
      return false
    case 'wordle':
    case 'falling':
    case 'mahjong':
    case 'sushi':
    case 'wordsearch':
    case 'snake':
    case 'hangman':
      return phase === 'play'
    case 'whack':
      return phase === 'play' && state?.cycle === 'up' && (state?.visibleIndex ?? -1) >= 0
    default:
      return false
  }
}

// One stable identity for the thing the player is answering right now.
export function hintRule(round) {
  const state = round?.state
  return {
    key: keyFor(round?.mode, state),
    active: activeFor(round?.mode, state, Boolean(round?.done)),
  }
}

// The correct option index for the choice-shaped modes (the engine stores the
// answer either as a `correct` flag on each choice or a separate `correct`).
function choiceHintIndex(round) {
  const question = round.state?.question
  if (question?.correctIndex != null) return question.correctIndex
  const options = round.state?.options ?? []
  const correct = round.state?.correct
  if (correct != null) return options.indexOf(correct)
  return -1
}

function pairsHint(round) {
  const byWord = new Map()
  ;(round.state?.cards ?? []).forEach((card, index) => {
    if (card.matched) return
    const list = byWord.get(card.word) ?? []
    list.push(index)
    byWord.set(card.word, list)
  })
  for (const list of byWord.values()) {
    if (list.length >= 2) return { kind: 'pair', a: list[0], b: list[1] }
  }
  return null
}

function columnsHint(round) {
  const leftWord = new Map()
  const rightWord = new Map()
  ;(round.state?.left ?? []).forEach((card, index) => {
    if (!card.matched) leftWord.set(card.word, index)
  })
  ;(round.state?.right ?? []).forEach((card, index) => {
    if (!card.matched) rightWord.set(card.word, index)
  })
  for (const [word, left] of leftWord.entries()) {
    const right = rightWord.get(word)
    if (right != null) return { kind: 'pair', a: left, b: right }
  }
  return null
}

function connectHint(round) {
  const cells = round.state?.cells ?? []
  const byWord = new Map()
  cells.forEach((cell, index) => {
    if (cell.cleared) return
    const list = byWord.get(cell.word) ?? []
    list.push(index)
    byWord.set(cell.word, list)
  })
  for (const list of byWord.values()) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        if (findConnectPath(cells, list[i], list[j])) {
          return { kind: 'pair', a: list[i], b: list[j] }
        }
      }
    }
  }
  return null
}

function memoryHint(round) {
  const slots = round.state?.slots ?? []
  const placed = slots.filter((slot) => slot.placed >= 0).length
  const slot = slots[placed]
  const faces = round.faces ?? []
  if (!slot || !faces[slot.word]) return null
  const answer = faceOf(faces[slot.word], 'zh')
  const index = (round.state?.choices ?? []).findIndex((choice) => choice.text === answer)
  return index >= 0 ? { kind: 'choice', index } : null
}

function spellHint(round) {
  const state = round.state
  const placed = state?.placed ?? []
  const target = state?.target ?? []
  const want = target[placed.length]
  if (!want) return null
  const index = (state?.tiles ?? []).findIndex((tile) => !tile.used && tile.ch === want)
  return index >= 0 ? { kind: 'tile', index } : null
}

function crosswordHint(round) {
  const layout = round.state?.layout
  if (!layout?.cells) return null
  for (let row = 0; row < layout.cells.length; row += 1) {
    for (let col = 0; col < layout.cells[row].length; col += 1) {
      const cell = layout.cells[row][col]
      if (cell.char && cell.filled == null) return { kind: 'cells', cells: [{ row, col }] }
    }
  }
  return null
}

// The wordsearch generator places words straight horizontal/vertical, so a
// simple row/column scan finds the exact line without stored placements.
function wordsearchCells(grid, kana) {
  const n = SIZE
  const chars = Array.from(kana)
  const length = chars.length
  const variants = [chars, [...chars].reverse()]
  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col + length <= n; col += 1) {
      for (const variant of variants) {
        let match = true
        for (let at = 0; at < length; at += 1) {
          if (grid[row * n + col + at] !== variant[at]) {
            match = false
            break
          }
        }
        if (match) return Array.from({ length }, (_v, at) => row * n + col + at)
      }
    }
  }
  for (let col = 0; col < n; col += 1) {
    for (let row = 0; row + length <= n; row += 1) {
      for (const variant of variants) {
        let match = true
        for (let at = 0; at < length; at += 1) {
          if (grid[(row + at) * n + col] !== variant[at]) {
            match = false
            break
          }
        }
        if (match) return Array.from({ length }, (_v, at) => (row + at) * n + col)
      }
    }
  }
  return null
}

function wordsearchHint(round) {
  const layout = round.state?.layout
  if (!layout?.grid || !layout?.words) return null
  const found = round.state?.found ?? []
  for (let at = 0; at < layout.words.length; at += 1) {
    if (found.includes(at)) continue
    const cells = wordsearchCells(layout.grid, layout.words[at].kana)
    if (cells) return { kind: 'cells', cells }
  }
  return null
}

// Set `round.hintEffect` to the mode's hint and return it. A null result is a
// best-effort miss (e.g. a degenerate board); the command still marks the hint
// used so the button cannot be spammed forever.
export function applyHint(round) {
  const mode = round?.mode
  const state = round?.state
  let effect = null

  switch (mode) {
    case 'choice':
    case 'boss':
    case 'nokanji': {
      const index = choiceHintIndex(round)
      if (index >= 0) effect = { kind: 'choice', index }
      break
    }
    case 'kanatrap':
    case 'fillblank': {
      const options = state?.options ?? []
      const correct = state?.correct
      const index = correct != null ? options.indexOf(correct) : -1
      if (index >= 0) effect = { kind: 'choice', index }
      break
    }
    case 'oddone':
    case 'spottypo':
      if (state?.oddIndex != null) effect = { kind: 'index', index: state.oddIndex }
      break
    case 'reaction':
      effect = { kind: 'index', index: (state?.cards ?? []).findIndex((card) => card.word === state?.target?.word) }
      if (effect.index < 0) effect = null
      break
    case 'falling':
      effect = { kind: 'index', index: (state?.cannons ?? []).findIndex((cannon) => cannon.word === state?.meteor?.word) }
      if (effect.index < 0) effect = null
      break
    case 'whack': {
      const index = (state?.holes ?? []).findIndex((hole) => hole.word === state?.targetWord)
      if (index >= 0) effect = { kind: 'index', index }
      break
    }
    case 'mahjong': {
      const index = (state?.tiles ?? []).findIndex((tile) => !tile.cleared && !tile.inTray && tile.free)
      if (index >= 0) effect = { kind: 'index', index }
      break
    }
    case 'pairs':
      effect = pairsHint(round)
      break
    case 'columns':
      effect = columnsHint(round)
      break
    case 'connect':
      effect = connectHint(round)
      break
    case 'match3': {
      const group = findMatch3Group(state?.cells ?? [])
      if (group) effect = { kind: 'cells', cells: group }
      break
    }
    case 'memory':
      effect = memoryHint(round)
      break
    case 'spell':
      effect = spellHint(round)
      break
    case 'swipe':
      effect = { kind: 'judge', correct: Boolean(state?.question?.isMatch) }
      break
    case 'wordle': {
      const letter = Array.from(state?.target ?? '')[0]
      if (letter) effect = { kind: 'letter', letter }
      break
    }
    case 'hangman': {
      const letter = (state?.target ?? []).find((ch) => !(state?.guessed ?? []).includes(ch))
      if (letter) effect = { kind: 'letter', letter }
      break
    }
    case 'sushi':
      effect = { kind: 'reading', reading: state?.queue?.[state?.position]?.kana ?? '' }
      if (!effect.reading) effect = null
      break
    case 'crossword':
      effect = crosswordHint(round)
      break
    case 'wordsearch':
      effect = wordsearchHint(round)
      break
    case 'snake':
      if (state?.foodAt != null) effect = { kind: 'index', index: state.foodAt }
      break
    default:
      effect = null
  }

  round.hintEffect = effect
  return effect
}