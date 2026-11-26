// Session state. Plain data only; commands perform the transitions.
import { defaultSettings } from '../dict/settings.js'
import { defaultQuizSetup } from '../study/quiz/setup.js'

export const SCREENS = [
  'loading',
  'home',
  'picker',
  'reader',
  'toc',
  'glyph',
  'card',
  'quiz',
  'quiz-play',
  'settings',
]

// `words` and `card` are study modes. `loading`, `home`, and `quiz` have none.
export const MODES = ['words', 'card']

export function createSession() {
  return {
    screen: 'loading',
    mode: null,
    // `download` feeds the loading bar while dict/vol.bin is streaming: `base`
    // is the verified percentage when the attempt started, `loaded` / `total`
    // are bytes, and `done` means the bytes have arrived and the bar holds at
    // 100 while the extracted lessons are verified.
    boot: {
      checked: 0,
      total: 0,
      done: false,
      error: null,
      running: false,
      download: { base: 0, loaded: 0, total: 0, done: false },
    },
    settings: defaultSettings(),
    // Lesson availability summary for the picker: [{ lesson, hasEntries, count }].
    lessons: [],
    // Theme: `value` is the theme in force and `source` says whether it came
    // from a stored user choice or from the OS preference. main.js resolves the
    // start value and applies it to the document root.
    theme: { value: 'light', source: 'system' },
    // Frozen study run: `{ lesson, index }` per entry, in list order. `lesson`
    // is the lesson number N; `index` is the position in that lesson's `vols`.
    items: [],
    index: 0,
    flipped: false,
    finished: false,
    // 單詞目錄 search text. Page-local, not persisted.
    tocQuery: '',
    // Fresh on each study.start. Seeds the reader's 5-sentence sample.
    runSeed: 0,
    // 字形對照 detail page. Set by glyph.open; null when no pair is open.
    glyph: null,
    // Incremented by glyph.play; the view watches it to replay the strokes.
    glyphPlayCount: 0,
    // Quiz setup + run. The setup persists under its own storage key; `run` is
    // null until quiz.start builds it.
    quiz: defaultQuizSetup(),
  }
}
