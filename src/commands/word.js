// Word reader navigation. Index is clamped: the first item does not move
// backward, the last item does not move forward.
import { CommandError } from '../engine/errors.js'

export function specs() {
  function ready(session) {
    return session.screen === 'reader' && session.items.length > 0
  }

  function jumpable(session) {
    return session.screen === 'toc' && session.items.length > 0
  }

  return [
    {
      id: 'word.next',
      params: [],
      enabled: ready,
      run: (session) => {
        if (session.index < session.items.length - 1) session.index += 1
        return { index: session.index }
      },
    },
    {
      id: 'word.prev',
      params: [],
      enabled: ready,
      run: (session) => {
        if (session.index > 0) session.index -= 1
        return { index: session.index }
      },
    },
    {
      id: 'word.goto',
      params: ['index'],
      enabled: jumpable,
      run: (session, params) => {
        const index = params.index
        if (!Number.isInteger(index) || index < 0 || index >= session.items.length) {
          throw new CommandError('invalid-index', `No word at index ${String(index)}`, {
            index,
            count: session.items.length,
          })
        }
        session.index = index
        session.screen = 'reader'
        session.tocQuery = ''
        return { index: session.index, screen: session.screen }
      },
    },
  ]
}
