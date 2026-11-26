// Settings defaults, validation, and patching. Plain data; no storage here.

export const SETTINGS_KEY = 'study-minna-no-nihongo-vocabulary-basic-settings'
export const LEGACY_SETTINGS_KEY = 'words-settings'

export const MODES = ['words', 'card']
export const DIRECTIONS = ['jp-zh', 'zh-jp']

export function makeDefaults() {
  return {
    words: {
      lessons: [],
      showReading: true,
      showExamples: true,
    },
    card: {
      lessons: [],
      direction: 'jp-zh',
      showReading: true,
      showStartReading: true,
      showHiraganaOnly: false,
    },
  }
}

export function defaultSettings() {
  return makeDefaults()
}

const SCHEMA = {
  words: {
    lessons: 'lessons',
    showReading: 'boolean',
    showExamples: 'boolean',
  },
  card: {
    lessons: 'lessons',
    direction: 'direction',
    showReading: 'boolean',
    showStartReading: 'boolean',
    showHiraganaOnly: 'boolean',
  },
}

function isBoolean(value) {
  return typeof value === 'boolean'
}

function isDirection(value) {
  return typeof value === 'string' && DIRECTIONS.includes(value)
}

function isLessonArray(value) {
  return (
    Array.isArray(value) &&
    value.every((n) => Number.isInteger(n) && n >= 1 && n <= 50) &&
    new Set(value).size === value.length
  )
}

function validValue(kind, value) {
  switch (kind) {
    case 'lessons':
      return isLessonArray(value)
    case 'boolean':
      return isBoolean(value)
    case 'direction':
      return isDirection(value)
    default:
      return false
  }
}

function cleanLessons(value) {
  return [...value].sort((a, b) => a - b)
}

// Merge stored/session data onto defaults. Unknown keys are dropped and an
// invalid value falls back to that field's default (the spec says a missing
// field uses the default; invalid JSON resets the whole object upstream).
export function normalizeSettings(raw) {
  const defaults = makeDefaults()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults
  for (const mode of MODES) {
    const source = raw[mode]
    if (!source || typeof source !== 'object' || Array.isArray(source)) continue
    for (const [key, kind] of Object.entries(SCHEMA[mode])) {
      const value = source[key]
      if (!validValue(kind, value)) continue
      if (kind === 'lessons') defaults[mode][key] = cleanLessons(value)
      else defaults[mode][key] = value
    }
  }
  return defaults
}

// Validate a settings.patch payload. Any unknown key or bad value rejects the
// whole patch, as the spec requires.
export function validatePatch(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return { ok: false, message: 'patch must be an object' }
  }
  for (const [mode, value] of Object.entries(patch)) {
    if (!MODES.includes(mode)) {
      return { ok: false, message: `unknown settings section: ${mode}` }
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { ok: false, message: `${mode} patch must be an object` }
    }
    const schema = SCHEMA[mode]
    for (const [key, field] of Object.entries(value)) {
      if (!(key in schema)) {
        return { ok: false, message: `unknown setting: ${mode}.${key}` }
      }
      if (!validValue(schema[key], field)) {
        return { ok: false, message: `invalid value for ${mode}.${key}` }
      }
    }
  }
  return { ok: true }
}

export function applyPatch(settings, patch) {
  const next = JSON.parse(JSON.stringify(settings))
  for (const [mode, value] of Object.entries(patch)) {
    for (const [key, field] of Object.entries(value)) {
      if (key === 'lessons') next[mode].lessons = cleanLessons(field)
      else next[mode][key] = field
    }
  }
  return next
}
