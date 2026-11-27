import { describe, expect, it } from 'vitest'
import { applyHint, hintRule, HINT_DELAY_MS } from './hint.js'
import { act, createRound } from './engine.js'
import { CONCRETE_MODES } from './modes.js'

const WORDS = [
  { japanese: 'たべます', kanji: '食べます', chinese: '吃' },
  { japanese: 'のみます', kanji: '飲みます', chinese: '喝' },
  { japanese: 'かいます', kanji: '買います', chinese: '買' },
  { japanese: 'いきます', kanji: '行きます', chinese: '去' },
  { japanese: 'かお', kanji: '顔', chinese: '臉' },
  { japanese: 'おかね', kanji: 'お金', chinese: '錢' },
  { japanese: 'かみ', kanji: '髪', chinese: '頭髮' },
  { japanese: 'ねこ', kanji: '猫', chinese: '貓' },
  { japanese: 'いぬ', kanji: '犬', chinese: '狗' },
  { japanese: 'みみ', kanji: '耳', chinese: '耳朵' },
  { japanese: 'せんせい', kanji: '先生', chinese: '老師' },
  { japanese: 'がくせい', kanji: '学生', chinese: '學生' },
]

function lib(count = WORDS.length) {
  const vols = WORDS.slice(0, count)
  return {
    getVols: (lesson) => (lesson === 1 ? vols : []),
    entry: ({ lesson, index }) => (lesson === 1 ? vols[index] ?? null : null),
  }
}

function refs(n) {
  return Array.from({ length: n }, (_v, index) => ({ lesson: 1, index }))
}

const zeroRandom = () => 0

describe('quiz hints', () => {
  it('uses a 10 second continuous-actionable clock', () => {
    expect(HINT_DELAY_MS).toBe(10000)
  })

  it('every remaining concrete mode has a hint rule and a safe hint effect', () => {
    expect(CONCRETE_MODES.length).toBe(24)
    for (const mode of CONCRETE_MODES) {
      const round = createRound(mode, refs(12), lib(), refs(12), zeroRandom, 0)
      const rule = hintRule(round)
      expect(typeof rule.key, `${mode} key`).toBe('string')
      expect(rule.key.length, `${mode} key non-empty`).toBeGreaterThan(0)
      expect(typeof rule.active, `${mode} active`).toBe('boolean')

      // Applying a hint must never throw, even on a degenerate board, and must
      // store exactly what it returns so the views read one field only.
      const effect = applyHint(round)
      expect(round.hintEffect, `${mode} effect`).toBe(effect)
    }
  })

  it('the question modes are actionable while asking', () => {
    for (const mode of ['choice', 'boss', 'nokanji', 'kanatrap', 'fillblank', 'spell']) {
      const round = createRound(mode, refs(12), lib(), refs(12), zeroRandom, 0)
      expect(hintRule(round).active, mode).toBe(true)
    }
  })

  it('kanatrap resets the hint clock on every one of its 10 questions', () => {
    const round = createRound('kanatrap', refs(12), lib(), refs(12), zeroRandom, 0)
    const keys = new Set([hintRule(round).key])
    expect(hintRule(round).active).toBe(true)
    for (let i = 0; i < 10; i += 1) {
      act(round, { type: 'choose', index: round.state.options.indexOf(round.state.correct) })
      // The pause on a correct answer is a held clock, like the other question modes.
      expect(hintRule(round).active).toBe(false)
      act(round, { type: 'next' })
      keys.add(hintRule(round).key)
    }
    expect(round.done).toBe(true)
    expect(keys.size).toBe(11)
  })

  it('pairs is held during the opening peek and turns actionable after resolve', () => {
    const round = createRound('pairs', refs(4), lib(), refs(4), zeroRandom, 0)
    expect(round.state.peek).toBe(true)
    expect(hintRule(round).active).toBe(false)
    // The view dispatches quiz.resolve after the 3s peek.
    round.state.peek = false
    round.state.locked = false
    expect(hintRule(round).active).toBe(true)
  })

  it('match3 is held through the opening drop-in', () => {
    const round = createRound('match3', refs(6), lib(), refs(6), zeroRandom, 0)
    expect(round.state.locked).toBe(true)
    expect(hintRule(round).active).toBe(false)
    round.state.phase = 'play'
    round.state.locked = false
    expect(hintRule(round).active).toBe(true)
  })

  it('whack only counts while a mole is up', () => {
    const round = createRound('whack', refs(6), lib(), refs(6), zeroRandom, 0)
    expect(hintRule(round).active).toBe(true)
    round.state.cycle = 'down'
    round.state.visibleIndex = -1
    expect(hintRule(round).active).toBe(false)
  })

  it('memory is held through the pile, deal, and countdown, then active', () => {
    const round = createRound('memory', refs(6), lib(), refs(6), zeroRandom, 0)
    expect(hintRule(round).active).toBe(false)
    round.state.phase = 'ask'
    expect(hintRule(round).active).toBe(true)
  })

  it('a choice hint points at the correct option', () => {
    const round = createRound('choice', refs(12), lib(), refs(12), zeroRandom, 0)
    const effect = applyHint(round)
    expect(effect.kind).toBe('choice')
    expect(effect.index).toBe(round.state.question.correctIndex)
  })
})