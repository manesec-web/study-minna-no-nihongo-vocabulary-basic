import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { allSpecs } from '../commands/index.js'
import { CONCRETE_MODES, MODE_LABELS, SETUP_MODES } from '../study/quiz/modes.js'
import { act, createRound } from '../study/quiz/engine.js'
import { evaluateEligibility } from '../study/quiz/eligibility.js'
import { NEW_GAMES } from '../study/quiz/games/index.js'
import { GAME_COMPONENTS } from './games/index.js'

function source(name) {
  return fs.readFileSync(new URL(name, import.meta.url), 'utf8')
}

// Render one game component to HTML with a stub store. A render that throws
// (e.g. a missing question) rejects or emits an empty comment, so the caller
// asserts on the markup it expects to see.
async function renderGame(mode, round) {
  const component = GAME_COMPONENTS[mode]
  const app = createSSRApp(component, { round })
  app.provide('store', { send: () => ({ ok: true, result: {} }), deps: {} })
  return renderToString(app)
}

const WORDS = [
  { japanese: 'たべます', kanji: '食べます', chinese: '吃' },
  { japanese: 'のみます', kanji: '飲みます', chinese: '喝' },
  { japanese: 'かいます', kanji: '買います', chinese: '買' },
  { japanese: 'いきます', kanji: '行きます', chinese: '去' },
  { japanese: 'かお', kanji: '顔', chinese: '臉' },
  { japanese: 'おかね', kanji: 'お金', chinese: '錢' },
]
const LIB = {
  getVols: (lesson) => (lesson === 1 ? WORDS : []),
  entry: ({ lesson, index }) => (lesson === 1 ? WORDS[index] ?? null : null),
}
const REFS = WORDS.map((_v, index) => ({ lesson: 1, index }))

// The question modes: one answer per question, then an advance. After the
// advance the next question's board must still render (去漢字盲測 once stored
// `undefined` here and rendered a blank play area).
const QUESTION_MODES = ['choice', 'boss', 'nokanji', 'fillblank', 'swipe', 'kanatrap']

function answerCorrectly(round) {
  const state = round.state
  let event
  if (round.mode === 'swipe') {
    // 極速是非 is judged true/false and moves on at once.
    event = act(round, { type: 'judge', value: state.question.isMatch })
  } else {
    let index = state.question?.correctIndex
    if (index == null && Array.isArray(state.options)) index = state.options.indexOf(state.correct)
    expect(index, `${round.mode} has a correct option`).toBeGreaterThanOrEqual(0)
    event = act(round, { type: 'choose', index })
  }
  expect(event.life, `${round.mode} correct answer costs no life`).toBe(0)
}

function advance(round) {
  if (round.state.phase === 'correct') act(round, { type: 'next' })
  else if (round.state.phase === 'reveal') act(round, { type: 'confirm' })
  expect(round.state.phase, `${round.mode} advances to the next question`).toBe('ask')
}

function questionNumber(round) {
  return round.state.index ?? round.state.position
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

  it('removes the retired 音拍猜謎 (mora) mode end to end: 24 concrete modes', () => {
    expect(CONCRETE_MODES).not.toContain('mora')
    expect(CONCRETE_MODES.length).toBe(24)
    expect(SETUP_MODES).not.toContain('mora')
    expect(MODE_LABELS.mora).toBeUndefined()
    expect(Object.values(MODE_LABELS)).not.toContain('音拍猜謎')
    expect(NEW_GAMES.mora).toBeUndefined()
    expect(GAME_COMPONENTS.mora).toBeUndefined()
    expect(Object.keys(evaluateEligibility(LIB, [1]))).not.toContain('mora')
    for (const file of ['../study/quiz/games/game-mora.js', './games/game-mora.vue']) {
      expect(fs.existsSync(new URL(file, import.meta.url)), file).toBe(false)
    }
    expect(source('../study/quiz/hint.js')).not.toMatch(/mora/)
    expect(source('./QuizView.vue')).not.toMatch(/音拍猜謎/)
    // The remaining modes still build a round and have a hint rule.
    for (const mode of CONCRETE_MODES) {
      const round = createRound(mode, REFS, LIB, REFS, () => 0.3, 0)
      expect(round.state, mode).toBeTruthy()
      expect(GAME_COMPONENTS[mode], mode).toBeTruthy()
    }
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

  it('pairs is a fixed 4-column grid (4 per row, 5 rows)', () => {
    const text = fs.readFileSync(new URL('../styles/quiz-games.css', import.meta.url), 'utf8')
    expect(text).toMatch(/\.pairs-grid \{\n  display: grid;\n  grid-template-columns: repeat\(4, 1fr\);/)
    expect(text).not.toMatch(/max-width: 550px/)
  })

  it('pairs peek drains over 3 seconds', () => {
    const css = fs.readFileSync(new URL('../styles/quiz-games.css', import.meta.url), 'utf8')
    expect(css).toMatch(/pairs-peek-drain 3s linear forwards/)
  })

  it('memory uses a pile and three slots, not the old poker table', () => {
    const text = source('./games/game-memory.vue')
    expect(text).toMatch(/memory-pile/)
    expect(text).toMatch(/memory-slot/)
    expect(text).not.toMatch(/memory-table/)
  })

  it('reaction big prompt has no hardcoded leading colon', () => {
    const text = source('./games/game-reaction.vue')
    expect(text).not.toMatch(/prompt-text">：/)
    expect(text).toMatch(/prompt-text">\{\{ faceOf\(props\.round\.faces\[state\.target\.word\], state\.target\.face\) \}\}<\/span>/)
  })

  it('Boss 戰 and 選擇題 mark the picked choice with an icon only, in a slot that never shifts the label', () => {
    const css = fs.readFileSync(new URL('../styles/quiz-games.css', import.meta.url), 'utf8')
    for (const file of ['./games/game-boss.vue', './games/game-choice.vue']) {
      const text = source(file)
      expect(text, file).toMatch(/class="choice-mark" aria-hidden="true">✓<\/span>/)
      expect(text, file).toMatch(/choice-mark choice-mark--wrong" aria-hidden="true">✗<\/span>/)
      // No 正確/錯誤 words inside the mark, and no inline size that reflows.
      expect(text, file).not.toMatch(/choice-mark[^>]*>[^<]*(正確|錯誤)/)
    }
    expect(css).toMatch(/\.choice--with-mark \{\n  position: relative;/)
    expect(css).toMatch(/\.choice-mark \{[\s\S]*?position: absolute;/)
  })

  it('極速是非 judges with icon-only ⭕/❌ buttons and turns a mis-judged card red', () => {
    const text = source('./games/game-swipe.vue')
    expect(text).toMatch(/aria-label="錯誤配對"[\s\S]*?@click="judge\(false\)"\s*>❌<\/button>/)
    expect(text).toMatch(/aria-label="正確配對"[\s\S]*?@click="judge\(true\)"\s*>⭕<\/button>/)
    // Both buttons are the same neutral button: neither answer is the "primary" one.
    expect(text).toMatch(/class="button ghost swipe-action"[\s\S]*?aria-label="錯誤配對"/)
    expect(text).toMatch(/class="button ghost swipe-action"[\s\S]*?aria-label="正確配對"/)
    expect(text).not.toMatch(/button primary swipe-action/)
    expect(text).toMatch(/'swipe-card--wrong': state\.phase === 'wrong'/)
    expect(text).toMatch(/'swipe-action--wrong': state\.phase === 'wrong' && state\.chosen === (false|true)/)
    const css = fs.readFileSync(new URL('../styles/quiz-games.css', import.meta.url), 'utf8')
    expect(css).toMatch(/\.swipe-card--wrong \{\n  border-color: var\(--error\);\n  color: var\(--error\);\n\}/)
    // The shell advances 極速是非 after ~0.5s (correct) / ~3s (wrong).
    const shell = source('./QuizPlayView.vue')
    expect(shell).toMatch(/mode === 'swipe' \? 500/)
    expect(shell).toMatch(/mode === 'boss' \|\| mode === 'swipe' \? 3000/)
  })

  it('找出內鬼 is a one-per-row list, not a 2×2 grid', () => {
    const text = source('./games/game-oddone.vue')
    expect(text).toMatch(/class="oddone-grid oddone-grid--list"/)
    const css = fs.readFileSync(new URL('../styles/quiz-games.css', import.meta.url), 'utf8')
    expect(css).toMatch(/\.oddone-grid--list \{\n  grid-template-columns: 1fr;\n  gap: 8px;\n\}/)
    // 找碴讀音 shares the 2×2 grid class and is not converted.
    expect(source('./games/game-spottypo.vue')).not.toMatch(/oddone-grid--list/)
  })

  it('猜假名 and 五十音劊子手 use a 6-column pad fed from state', () => {
    const css = fs.readFileSync(new URL('../styles/quiz-games.css', import.meta.url), 'utf8')
    expect(css).toMatch(/\.wordle-pad \{\n  display: grid;\n  grid-template-columns: repeat\(6, minmax\(0, 1fr\)\);/)
    for (const file of ['./games/game-wordle.vue', './games/game-hangman.vue']) {
      expect(source(file), file).toMatch(/state\.value\.pad \?\? \[\]/)
    }
  })

  it('every concrete mode has a game component', () => {
    for (const mode of CONCRETE_MODES) {
      expect(GAME_COMPONENTS[mode], `missing component for ${mode}`).toBeTruthy()
    }
    expect(CONCRETE_MODES.length).toBe(24)
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
      'quiz.nextRound',
      'quiz.hintReady',
      'quiz.hint',
    ]) {
      expect(ids).toContain(id)
    }
  })

  it('the play shell shows a 提示 hint button driven by quiz.hint', () => {
    const text = source('./QuizPlayView.vue')
    expect(text).toMatch(/quiz-hint-button/)
    expect(text).toMatch(/提示/)
    expect(text).toMatch(/quiz\.hintReady/)
    expect(text).toMatch(/quiz\.hint'?\)/)
  })

  it('every question mode renders its board on the second question, not only the first', async () => {
    for (const mode of QUESTION_MODES) {
      const round = createRound(mode, REFS, LIB, REFS, () => 0.3, 0)
      const first = await renderGame(mode, round)
      expect(first, `${mode} first board`).toMatch(/class="board"/)
      answerCorrectly(round)
      advance(round)
      expect(questionNumber(round), `${mode} moved to question 2`).toBe(1)
      const second = await renderGame(mode, round)
      expect(second, `${mode} second board`).toMatch(/class="board"/)
      expect(second, `${mode} second board`).toMatch(/<button[^>]*class="/)
    }
  })
})
