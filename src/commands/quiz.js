// Quiz commands: setup editing, run building, and every in-round action. The
// view and the tests call these through dispatch; all mode rules live in
// src/study/quiz/engine.js.
import { CommandError } from '../engine/errors.js'
import { CONCRETE_MODES, COUNT_OPTIONS, LIVES_OPTIONS, TIME_OPTIONS } from '../study/quiz/modes.js'
import { applyQuizPatch, validateQuizPatch } from '../study/quiz/setup.js'
import { act, beginNext, buildQuizRun, createRound, drawModeAt, timeSeconds } from '../study/quiz/engine.js'

export function specs(deps = {}) {
  const library = deps.library
  const storage = deps.quizStorage
  const random = deps.random ?? Math.random

  function persist(session) {
    if (storage) storage.save(session.quiz)
  }

  function activeRun(session) {
    return session.screen === 'quiz-play' && session.quiz && session.quiz.run ? session.quiz.run : null
  }

  function patch(session, patch) {
    const validation = validateQuizPatch(patch)
    if (!validation.ok) throw new CommandError('invalid-settings', validation.message)
    session.quiz = applyQuizPatch(session.quiz, patch)
    persist(session)
    return { quiz: session.quiz }
  }

  function applyEvent(session, event) {
    const run = session.quiz.run
    const round = run.round
    if (!round || !event) return
    if (event.life < 0 && run.lives !== null) run.lives = Math.max(0, run.lives + event.life)
    const score = event.score || 0
    run.score += score
    round.score += score
    if (event.clock === 'start' || event.clock === 'reset') {
      const seconds = round.clockSeconds || round.clock.seconds
      if (seconds > 0) {
        round.clock.active = true
        round.clock.seconds = seconds
        round.clock.key += 1
      }
    } else if (event.clock === 'stop') {
      round.clock.active = false
    }

    if (run.lives === 0) {
      run.phase = 'over'
      run.reason = 'lives'
      round.done = true
      round.cleared = false
      run.history.push({ mode: round.mode, cleared: false, score: round.score })
      return
    }
    if (round.done) {
      run.history.push({ mode: round.mode, cleared: round.cleared, score: round.score })
      run.phase = run.roundIndex >= run.batches.length - 1 ? 'over' : 'done'
      if (run.phase === 'over') run.reason = round.cleared ? 'cleared' : 'incomplete'
    }
  }

  function startRound(session, mode) {
    const run = session.quiz.run
    const batch = run.batches[run.roundIndex]
    run.round = createRound(mode, batch, library, run.words, random, timeSeconds(session.quiz.time))
    run.phase = 'round'
    run.draw = null
    run.lastMode = mode
  }

  return [
    {
      id: 'quiz.toggleLesson',
      params: ['lesson'],
      enabled: (session, params) =>
        Number.isInteger(params.lesson) && params.lesson >= 1 && params.lesson <= 50,
      run: (session, params) => {
        if (!library || !library.hasEntries(params.lesson)) {
          throw new CommandError('lesson-empty', `第${params.lesson}課沒有單詞`, {
            lesson: params.lesson,
          })
        }
        const lessons = session.quiz.lessons
        const selected = lessons.includes(params.lesson)
        session.quiz.lessons = selected
          ? lessons.filter((lesson) => lesson !== params.lesson)
          : [...lessons, params.lesson].sort((a, b) => a - b)
        persist(session)
        return { lessons: session.quiz.lessons }
      },
    },
    {
      id: 'quiz.selectAll',
      params: [],
      run: (session) => {
        const all = library ? library.entryLessons() : []
        const allSelected = all.length > 0 && all.every((lesson) => session.quiz.lessons.includes(lesson))
        session.quiz.lessons = allSelected ? [] : all
        persist(session)
        return { lessons: session.quiz.lessons }
      },
    },
    {
      id: 'quiz.setCount',
      params: ['count'],
      run: (session, params) => patch(session, { count: params.count }),
    },
    {
      id: 'quiz.toggleMode',
      params: ['mode'],
      enabled: (session, params) =>
        !session.quiz.random && CONCRETE_MODES.includes(params.mode),
      run: (session, params) => {
        const modes = session.quiz.modes
        const selected = modes.includes(params.mode)
        session.quiz.modes = selected
          ? modes.filter((mode) => mode !== params.mode)
          : [...modes, params.mode]
        persist(session)
        return { modes: session.quiz.modes }
      },
    },
    {
      id: 'quiz.toggleRandom',
      params: [],
      run: (session) => patch(session, { random: !session.quiz.random }),
    },
    {
      id: 'quiz.setLives',
      params: ['lives'],
      run: (session, params) => patch(session, { lives: params.lives }),
    },
    {
      id: 'quiz.setTime',
      params: ['time'],
      run: (session, params) => patch(session, { time: params.time }),
    },
    {
      id: 'quiz.start',
      params: [],
      enabled: (session) => session.screen === 'quiz' && session.quiz.lessons.length > 0,
      run: (session) => {
        if (!library) throw new CommandError('library-missing', 'library is not configured')
        const run = buildQuizRun(library, session.quiz, random)
        run.roundIndex = 0
        session.quiz.run = run
        beginNext(run, library, random, timeSeconds(session.quiz.time))
        session.screen = 'quiz-play'
        return { phase: run.phase, words: run.words.length, batches: run.batches.length }
      },
    },
    {
      id: 'quiz.tap',
      params: ['index'],
      enabled: (session) => {
        const run = activeRun(session)
        return Boolean(run && (run.phase === 'round' || run.phase === 'draw'))
      },
      run: (session, params) => {
        const run = session.quiz.run
        if (run.phase === 'draw') {
          const mode = drawModeAt(run, params.index)
          if (!mode) {
            throw new CommandError('invalid-index', `No draw card at index ${String(params.index)}`)
          }
          startRound(session, mode)
          return { phase: 'round', mode }
        }
        const event = act(run.round, { type: 'tap', index: params.index }, { library, random })
        applyEvent(session, event)
        return { event, phase: run.phase, round: run.round }
      },
    },
    {
      id: 'quiz.choose',
      params: ['index'],
      enabled: (session) => Boolean(activeRun(session) && session.quiz.run.phase === 'round'),
      run: (session, params) => {
        const run = session.quiz.run
        const event = act(run.round, { type: 'choose', index: params.index }, { library, random })
        applyEvent(session, event)
        return { event, phase: run.phase, round: run.round }
      },
    },
    {
      id: 'quiz.act',
      params: ['type'],
      enabled: (session) => Boolean(activeRun(session) && session.quiz.run.phase === 'round'),
      run: (session, params) => {
        const run = session.quiz.run
        const event = act(
          run.round,
          { type: params.type, index: params.index, value: params.value },
          { library, random },
        )
        applyEvent(session, event)
        return { event, phase: run.phase, round: run.round }
      },
    },
    {
      id: 'quiz.confirm',
      params: [],
      enabled: (session) => Boolean(activeRun(session) && session.quiz.run.phase === 'round'),
      run: (session) => {
        const run = session.quiz.run
        const event = act(run.round, { type: 'confirm' }, { library, random })
        applyEvent(session, event)
        return { event, phase: run.phase, round: run.round }
      },
    },
    {
      id: 'quiz.next',
      params: [],
      enabled: (session) => Boolean(activeRun(session) && session.quiz.run.phase === 'round'),
      run: (session) => {
        const run = session.quiz.run
        const event = act(run.round, { type: 'next' }, { library, random })
        applyEvent(session, event)
        return { event, phase: run.phase, round: run.round }
      },
    },
    {
      id: 'quiz.resolve',
      params: [],
      enabled: (session) => {
        const run = activeRun(session)
        return Boolean(run && run.phase === 'round' && run.round?.state?.locked)
      },
      run: (session) => {
        const run = session.quiz.run
        const event = act(run.round, { type: 'resolve' }, { library, random })
        applyEvent(session, event)
        return { event, phase: run.phase, round: run.round }
      },
    },
    {
      id: 'quiz.timeout',
      params: [],
      enabled: (session) => Boolean(activeRun(session) && session.quiz.run.phase === 'round'),
      run: (session) => {
        const run = session.quiz.run
        const event = act(run.round, { type: 'timeout' }, { library, random })
        applyEvent(session, event)
        return { event, phase: run.phase, round: run.round }
      },
    },
    {
      id: 'quiz.end',
      params: [],
      enabled: (session) => Boolean(activeRun(session) && session.quiz.run.phase === 'round'),
      run: (session) => {
        const run = session.quiz.run
        const event = act(run.round, { type: 'end' }, { library, random })
        applyEvent(session, event)
        return { event, phase: run.phase, round: run.round }
      },
    },
    {
      id: 'quiz.nextRound',
      params: [],
      enabled: (session) => {
        const run = activeRun(session)
        return Boolean(run && run.phase === 'done')
      },
      run: (session) => {
        const run = session.quiz.run
        run.roundIndex += 1
        beginNext(run, library, random, timeSeconds(session.quiz.time))
        return { phase: run.phase, roundIndex: run.roundIndex }
      },
    },
  ]
}

// Re-export the pure setup constants for the view and tests.
export const QUIZ_COUNT_OPTIONS = COUNT_OPTIONS
export const QUIZ_LIVES_OPTIONS = LIVES_OPTIONS
export const QUIZ_TIME_OPTIONS = TIME_OPTIONS
