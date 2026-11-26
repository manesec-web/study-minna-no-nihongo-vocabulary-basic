// Physical keyboard binding for the Wordle-style games. Presentation only: it
// maps keydown events to the same callbacks as the on-screen keys, so the
// engine's guards (length, submit) stay the single source of truth.
export function attachKeyboard(handler) {
  if (typeof window === 'undefined') return () => {}
  const onKeydown = (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return
    if (event.key === 'Backspace') {
      event.preventDefault()
      handler.onBackspace()
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      handler.onSubmit()
      return
    }
    if (typeof event.key === 'string' && Array.from(event.key).length === 1) {
      handler.onChar(event.key)
    }
  }
  window.addEventListener('keydown', onKeydown)
  return () => window.removeEventListener('keydown', onKeydown)
}
