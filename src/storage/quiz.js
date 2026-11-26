// Quiz setup persistence. The quiz setup lives beside the word/card settings in
// its own localStorage key under the shared prefix, so the migrated settings
// schema and its storage adapter stay untouched.
import { defaultQuizSetup, normalizeQuizSetup } from '../study/quiz/setup.js'

export const QUIZ_SETTINGS_KEY = 'study-minna-no-nihongo-vocabulary-basic-quiz'

export function createQuizStorage(storage = null) {
  const target = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null)

  function load() {
    if (!target) return defaultQuizSetup()
    try {
      const raw = target.getItem(QUIZ_SETTINGS_KEY)
      if (raw == null) return defaultQuizSetup()
      return normalizeQuizSetup(JSON.parse(raw))
    } catch {
      return defaultQuizSetup()
    }
  }

  function save(setup) {
    if (!target) return
    try {
      target.setItem(QUIZ_SETTINGS_KEY, JSON.stringify(setup))
    } catch {
      /* a failed write leaves the stored value in place */
    }
  }

  return { load, save }
}
