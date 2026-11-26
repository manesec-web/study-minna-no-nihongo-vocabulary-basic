import { SCREENS, MODES } from '../engine/session.js'

// 單詞目錄 belongs to the reader only: it lists that run's frozen words, so
// there is nothing to show before a run started or from another screen.
function reachable(session, screen) {
  switch (screen) {
    case 'loading':
      return false
    case 'home':
      // Bootstrap lands here straight from `loading`.
      return true
    case 'picker':
      return session.screen === 'home' || session.screen === 'reader' || session.screen === 'card'
    case 'quiz':
      return session.screen === 'home'
    case 'quiz-play':
      return session.screen === 'quiz'
    case 'reader':
      return session.screen === 'toc' || session.screen === 'settings' || session.screen === 'glyph'
    case 'card':
      return session.screen === 'settings'
    case 'toc':
      return session.screen === 'reader' && session.items.length > 0
    case 'glyph':
      return session.screen === 'reader'
    case 'settings':
      return session.screen === 'reader' || session.screen === 'card'
    default:
      return false
  }
}

export function specs() {
  return [
    {
      id: 'nav.go',
      params: ['screen'],
      enabled: (session, params) =>
        SCREENS.includes(params.screen) &&
        reachable(session, params.screen) &&
        (params.mode === undefined || MODES.includes(params.mode)),
      run: (session, params) => {
        // Leaving 單詞目錄 discards the search query.
        if (session.screen === 'toc' && params.screen !== 'toc') session.tocQuery = ''
        session.screen = params.screen
        if (params.mode !== undefined) {
          session.mode = params.mode
        } else if (params.screen === 'home' || params.screen === 'quiz') {
          // These screens have no study mode.
          session.mode = null
        }
        return { screen: session.screen, mode: session.mode }
      },
    },
  ]
}
