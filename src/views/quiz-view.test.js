import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import { allSpecs } from '../commands/index.js'
import { CONCRETE_MODES } from '../study/quiz/modes.js'
import { GAME_COMPONENTS } from './games/index.js'

function source(name) {
  return fs.readFileSync(new URL(name, import.meta.url), 'utf8')
}

describe('the quiz is tap-driven, not a keyboard', () => {
  it('the quiz setup view has no input and no key', () => {
    const text = source('./QuizView.vue')
    expect(text).not.toMatch(/<input\b/i)
    expect(text).not.toMatch(/quiz-key/)
    expect(text).not.toMatch(/keyboard/i)
  })

  it('the quiz play view has no input and no key', () => {
    const text = source('./QuizPlayView.vue')
    expect(text).not.toMatch(/<input\b/i)
    expect(text).not.toMatch(/quiz-key/)
    expect(text).not.toMatch(/keyboard/i)
  })

  it('no quiz.input / quiz.submit / quiz.advance commands exist', () => {
    const ids = allSpecs({}).map((spec) => spec.id)
    expect(ids).not.toContain('quiz.input')
    expect(ids).not.toContain('quiz.submit')
    expect(ids).not.toContain('quiz.advance')
  })

  it('disables the concrete mode chips while 隨機模式 is on', () => {
    const text = source('./QuizView.vue')
    expect(text).toMatch(/quiz\.random \|\| !eligibility\[mode\]\?\.ok/)
    expect(text).toMatch(/\.chip--empty:disabled,\s*\.chip--mode:disabled/)
  })

  it('removes the retired 假名重組 and 卡片塔 modes', () => {
    const text = source('./QuizView.vue')
    expect(text).not.toMatch(/假名重組/)
    expect(text).not.toMatch(/卡片塔/)
  })

  it('routes the draw card tap through the reveal animation, not directly to quiz.tap', () => {
    const text = source('./QuizPlayView.vue')
    expect(text).toMatch(/@click="draw\(at, \$event\)"/)
    expect(text).toMatch(/playDrawCard/)
    expect(text).toMatch(/draw-card-inner/)
  })

  it('pairs start face-down: the visible front is ? and the text face is the rotated back', () => {
    const text = source('./games/game-pairs.vue')
    expect(text).toMatch(/pair-card-face pair-card-front">\?<\/span>/)
    expect(text).toMatch(/pair-card-face pair-card-back">\{\{ faceText\(card\) \}\}<\/span>/)
  })

  it('removes the 正確/錯誤 quiz feedback text', () => {
    const text = source('./QuizPlayView.vue')
    expect(text).not.toMatch(/quiz-feedback/)
    expect(text).not.toMatch(/round\.flash === 'correct' \? '正確' : '錯誤'/)
  })

  it('connect only disables cleared cells, not the whole locked board', () => {
    const text = source('./games/game-connect.vue')
    expect(text).toMatch(/:disabled="cell\.cleared"/)
    expect(text).not.toMatch(/cell\.cleared \|\| state\.locked/)
  })

  it('pairs has a 4-column mobile breakpoint and a 5-column desktop default', () => {
    const text = fs.readFileSync(new URL('../styles/quiz-games.css', import.meta.url), 'utf8')
    expect(text).toMatch(/grid-template-columns: repeat\(5, 1fr\)/)
    expect(text).toMatch(/max-width: 550px/)
    expect(text).toMatch(/grid-template-columns: repeat\(4, 1fr\)/)
  })

  it('reaction big prompt has no hardcoded leading colon', () => {
    const text = source('./games/game-reaction.vue')
    expect(text).not.toMatch(/prompt-text">：/)
    expect(text).toMatch(/prompt-text">\{\{ faceOf\(props\.round\.faces\[state\.target\.word\], state\.target\.face\) \}\}<\/span>/)
  })

  it('every concrete mode has a game component', () => {
    for (const mode of CONCRETE_MODES) {
      expect(GAME_COMPONENTS[mode], `missing component for ${mode}`).toBeTruthy()
    }
    expect(CONCRETE_MODES.length).toBe(27)
  })

  it('the quiz interaction commands are registered', () => {
    const ids = allSpecs({}).map((spec) => spec.id)
    for (const id of [
      'quiz.start',
      'quiz.tap',
      'quiz.choose',
      'quiz.act',
      'quiz.confirm',
      'quiz.next',
      'quiz.resolve',
      'quiz.timeout',
      'quiz.end',
      'quiz.nextRound',
    ]) {
      expect(ids).toContain(id)
    }
  })
})
