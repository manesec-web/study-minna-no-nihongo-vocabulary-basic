import { describe, expect, it } from 'vitest'
import { createRegistry } from '../engine/registry.js'
import { createSession } from '../engine/session.js'
import { CONCRETE_MODES } from '../study/quiz/modes.js'
import { specs as quizSpecs } from './quiz.js'

const WORDS = [
  { japanese: 'あか', kanji: '赤', chinese: '紅' },
  { japanese: 'いぬ', kanji: '犬', chinese: '狗' },
  { japanese: 'うみ', kanji: '海', chinese: '海' },
  { japanese: 'えき', kanji: '駅', chinese: '車站' },
  { japanese: 'おと', kanji: '音', chinese: '聲音' },
  { japanese: 'かさ', kanji: '傘', chinese: '雨傘' },
  { japanese: 'きく', kanji: '菊', chinese: '菊花' },
  { japanese: 'くり', kanji: '栗', chinese: '栗子' },
  { japanese: 'けさ', kanji: '今朝', chinese: '早晨' },
  { japanese: 'こえ', kanji: '声', chinese: '人聲' },
]

function fakeLibrary() {
  const vols = WORDS
  return {
    lessonCount: () => 1,
    hasEntries: (lesson) => lesson === 1,
    entryLessons: () => [1],
    getVols: (lesson) => (lesson === 1 ? vols : []),
    entry: ({ lesson, index }) => (lesson === 1 ? vols[index] ?? null : null),
  }
}

function makeRegistry(deps = {}) {
  const reg = createRegistry()
  reg.registerAll(quizSpecs({ library: fakeLibrary(), random: () => 0, ...deps }))
  return reg
}

function quizSession(overrides = {}) {
  const session = createSession()
  session.screen = 'quiz'
  session.lessons = [{ lesson: 1, hasEntries: true, count: WORDS.length }]
  session.quiz.lessons = [1]
  Object.assign(session.quiz, overrides)
  return session
}

describe('quiz setup commands', () => {
  it('toggles a lesson', () => {
    const reg = makeRegistry()
    const session = quizSession()
    reg.dispatch(session, 'quiz.toggleLesson', { lesson: 1 })
    expect(session.quiz.lessons).toEqual([])
    reg.dispatch(session, 'quiz.toggleLesson', { lesson: 1 })
    expect(session.quiz.lessons).toEqual([1])
  })

  it('selectAll toggles every non-empty lesson', () => {
    const reg = makeRegistry()
    const session = quizSession({ lessons: [] })
    reg.dispatch(session, 'quiz.selectAll')
    expect(session.quiz.lessons).toEqual([1])
    reg.dispatch(session, 'quiz.selectAll')
    expect(session.quiz.lessons).toEqual([])
  })

  it('rejects an invalid count', () => {
    const reg = makeRegistry()
    const session = quizSession()
    const result = reg.dispatch(session, 'quiz.setCount', { count: 99 })
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('invalid-settings')
  })

  it('toggles a concrete mode and the random flag', () => {
    const reg = makeRegistry()
    const session = quizSession()
    reg.dispatch(session, 'quiz.toggleMode', { mode: 'choice' })
    expect(session.quiz.modes).toEqual(['choice'])
    reg.dispatch(session, 'quiz.toggleRandom')
    expect(session.quiz.random).toBe(true)
    expect(session.quiz.modes).toEqual([])
  })

  it('disables quiz.toggleMode while 隨機模式 is on', () => {
    const reg = makeRegistry()
    const session = quizSession({ random: true, modes: [] })
    const result = reg.dispatch(session, 'quiz.toggleMode', { mode: 'choice' })
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('command-disabled')
    expect(session.quiz.modes).toEqual([])

    reg.dispatch(session, 'quiz.toggleRandom')
    expect(session.quiz.random).toBe(false)
    expect(session.quiz.modes).toEqual([])
    reg.dispatch(session, 'quiz.toggleMode', { mode: 'pairs' })
    expect(session.quiz.modes).toEqual(['pairs'])
  })
})

describe('quiz.start', () => {
  it('builds a sequential run and opens quiz-play', () => {
    const reg = makeRegistry()
    const session = quizSession({ modes: ['choice'], count: 'all', time: 'infinite' })
    const result = reg.dispatch(session, 'quiz.start')
    expect(result.ok).toBe(true)
    expect(session.screen).toBe('quiz-play')
    expect(session.quiz.run.phase).toBe('round')
    expect(session.quiz.run.round.mode).toBe('choice')
    expect(session.quiz.run.batches.length).toBe(1)
  })

  it('opens a draw when 隨機模式 is on', () => {
    const reg = makeRegistry()
    const session = quizSession({ random: true, modes: ['choice', 'pairs'] })
    reg.dispatch(session, 'quiz.start')
    expect(session.quiz.run.phase).toBe('draw')
    expect(session.quiz.run.draw.cards.length).toBe(9)
    expect(session.quiz.run.pool).toEqual(CONCRETE_MODES)

    const card = session.quiz.run.draw.cards[0]
    const result = reg.dispatch(session, 'quiz.tap', { index: 0 })
    expect(result.ok).toBe(true)
    expect(session.quiz.run.phase).toBe('round')
    expect(CONCRETE_MODES).toContain(card)
    expect(session.quiz.run.round.mode).toBe(card)
  })

  it('is disabled without a selected lesson', () => {
    const reg = makeRegistry()
    const session = quizSession({ lessons: [] })
    const result = reg.dispatch(session, 'quiz.start')
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('command-disabled')
  })
})

describe('quiz round interactions', () => {
  it('a correct choice advances without losing a life', () => {
    const reg = makeRegistry()
    const session = quizSession({ modes: ['choice'], lives: 3 })
    reg.dispatch(session, 'quiz.start')
    const round = session.quiz.run.round
    const correct = round.state.question.correctIndex
    const livesBefore = session.quiz.run.lives
    const result = reg.dispatch(session, 'quiz.choose', { index: correct })
    expect(result.ok).toBe(true)
    expect(session.quiz.run.lives).toBe(livesBefore)
    expect(session.quiz.run.score).toBeGreaterThan(0)
    expect(round.state.phase).toBe('correct')
    expect(round.clock.active).toBe(false)

    reg.dispatch(session, 'quiz.next')
    expect(round.state.phase).toBe('ask')
  })

  it('a wrong choice deducts a life and reveals, 確定 continues', () => {
    const reg = makeRegistry()
    const session = quizSession({ modes: ['choice'], lives: 3 })
    reg.dispatch(session, 'quiz.start')
    const round = session.quiz.run.round
    const wrong = (round.state.question.correctIndex + 1) % round.state.question.choices.length
    reg.dispatch(session, 'quiz.choose', { index: wrong })
    expect(session.quiz.run.lives).toBe(2)
    expect(round.state.phase).toBe('reveal')
    expect(round.reveal.text).toBeTruthy()

    reg.dispatch(session, 'quiz.confirm')
    expect(round.state.phase).toBe('ask')
    expect(round.state.index).toBe(1)
  })

  it('ends the quiz when the last life is lost', () => {
    const reg = makeRegistry()
    const session = quizSession({ modes: ['choice'], lives: 1 })
    reg.dispatch(session, 'quiz.start')
    const round = session.quiz.run.round
    const wrong = (round.state.question.correctIndex + 1) % round.state.question.choices.length
    reg.dispatch(session, 'quiz.choose', { index: wrong })
    expect(session.quiz.run.phase).toBe('over')
    expect(session.quiz.run.reason).toBe('lives')
    expect(session.quiz.run.lives).toBe(0)
  })

  it('a timeout on a time-limited question is judged as wrong', () => {
    const reg = makeRegistry()
    const session = quizSession({ modes: ['choice'], lives: 3, time: 5 })
    reg.dispatch(session, 'quiz.start')
    const round = session.quiz.run.round
    expect(round.clock.active).toBe(true)
    reg.dispatch(session, 'quiz.timeout')
    expect(session.quiz.run.lives).toBe(2)
    expect(round.state.phase).toBe('reveal')
  })

  it('finishes the run when the last question is answered', () => {
    const reg = makeRegistry()
    const session = quizSession({ modes: ['choice'], lives: 3, count: 'all' })
    // 10 words → one batch; answer every question correctly to finish the run.
    reg.dispatch(session, 'quiz.start')
    for (let i = 0; i < 10; i += 1) {
      const round = session.quiz.run.round
      reg.dispatch(session, 'quiz.choose', { index: round.state.question.correctIndex })
      if (session.quiz.run.phase !== 'over') reg.dispatch(session, 'quiz.next')
    }
    expect(session.quiz.run.phase).toBe('over')
    expect(session.quiz.run.reason).toBe('cleared')
  })
})
