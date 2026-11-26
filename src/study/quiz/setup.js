// Quiz setup defaults, validation, and patching. Plain data; storage lives in
// src/storage/quiz.js. The quiz setup is separate from the word/card settings
// schema so the existing settings screen and its migration stay untouched.
import { CONCRETE_MODES, COUNT_OPTIONS, LIVES_OPTIONS, TIME_OPTIONS } from './modes.js'

export function defaultQuizSetup() {
  return {
    lessons: [],
    count: 'all',
    modes: [],
    random: false,
    lives: 'infinite',
    time: 'infinite',
  }
}

function cleanLessons(value) {
  return [...new Set(value)].sort((a, b) => a - b)
}

function isLessonArray(value) {
  return (
    Array.isArray(value) &&
    value.every((n) => Number.isInteger(n) && n >= 1 && n <= 50) &&
    new Set(value).size === value.length
  )
}

function isCount(value) {
  return COUNT_OPTIONS.includes(value)
}

function isMode(value) {
  return typeof value === 'string' && CONCRETE_MODES.includes(value)
}

function isModeArray(value) {
  return (
    Array.isArray(value) &&
    value.every(isMode) &&
    new Set(value).size === value.length
  )
}

function isLives(value) {
  return LIVES_OPTIONS.includes(value)
}

function isTime(value) {
  return TIME_OPTIONS.includes(value)
}

const VALIDATORS = {
  lessons: isLessonArray,
  count: isCount,
  modes: isModeArray,
  random: (value) => typeof value === 'boolean',
  lives: isLives,
  time: isTime,
}

// Merge stored/session data onto defaults. Unknown keys are dropped and an
// invalid value falls back to that field's default.
export function normalizeQuizSetup(raw) {
  const defaults = defaultQuizSetup()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults
  for (const [key, validate] of Object.entries(VALIDATORS)) {
    const value = raw[key]
    if (key === 'modes') {
      // Keep the still-known concrete modes and drop removed ids (e.g. kana /
      // tower left in an older stored setup). A non-array value falls back to
      // the default empty list.
      if (Array.isArray(value)) {
        defaults.modes = [...new Set(value)].filter(isMode)
      }
      continue
    }
    if (validate(value)) {
      defaults[key] = key === 'lessons' ? [...value] : value
    }
  }
  if (defaults.lessons) defaults.lessons = cleanLessons(defaults.lessons)
  // A leftover mode list must not survive 隨機模式: load as random-only.
  if (defaults.random) defaults.modes = []
  return defaults
}

export function validateQuizPatch(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return { ok: false, message: 'quiz patch must be an object' }
  }
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in VALIDATORS)) {
      return { ok: false, message: `unknown quiz setting: ${key}` }
    }
    if (!VALIDATORS[key](value)) {
      return { ok: false, message: `invalid value for quiz.${key}` }
    }
  }
  return { ok: true }
}

export function applyQuizPatch(setup, patch) {
  const next = JSON.parse(JSON.stringify(setup))
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'lessons') next.lessons = cleanLessons(value)
    else if (key === 'modes') next.modes = [...value]
    else next[key] = value
  }
  // Turning 隨機模式 on, or patching while it is already on, drops any
  // concrete-mode selection so the draw pool stays every concrete mode.
  if (next.random) next.modes = []
  return next
}

// How many words the run should use, as a number. `all` means every word in
// the selected lessons.
export function requestedWordCount(setup, total) {
  if (setup.count === 'all') return total
  return Math.min(Number(setup.count), total)
}
