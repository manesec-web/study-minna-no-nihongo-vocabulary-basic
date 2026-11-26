import { CommandError } from '../engine/errors.js'
import { canStart } from '../dict/lessons.js'
import { buildItems } from '../study/items.js'
import { shuffle } from '../study/shuffle.js'

export const STUDY_SCREEN = { words: 'reader', card: 'card' }

export function specs(deps = {}) {
  const library = deps.library
  const random = deps.random

  return [
    {
      id: 'study.start',
      params: [],
      enabled: (session) => {
        if (session.mode !== 'words' && session.mode !== 'card') return false
        const selected = session.settings[session.mode]?.lessons ?? []
        return canStart(library ? library.lessonCount() : 0, selected)
      },
      run: (session) => {
        if (!library) {
          throw new CommandError('library-missing', 'library is not configured')
        }
        const mode = session.mode
        if (mode !== 'words' && mode !== 'card') {
          throw new CommandError('invalid-params', `study.start has no mode for ${String(mode)}`)
        }
        const lessonNumbers = session.settings[mode].lessons
        let items = buildItems(library, lessonNumbers)
        if (mode === 'card') {
          items = shuffle(items, random)
        }
        if (items.length === 0) {
          throw new CommandError('no-items', '沒有可練習的項目')
        }
        session.items = items
        session.index = 0
        session.flipped = false
        session.finished = false
        session.runSeed = Math.floor((random ?? Math.random)() * 0x100000000) >>> 0
        session.screen = STUDY_SCREEN[mode]
        return { count: items.length, screen: session.screen, runSeed: session.runSeed }
      },
    },
    {
      // Cards have no grading: 完成 on the last card ends the run.
      id: 'study.finish',
      params: [],
      enabled: (session) => session.screen === 'card' && session.items.length > 0,
      run: (session) => {
        session.finished = true
        return { finished: true }
      },
    },
  ]
}
