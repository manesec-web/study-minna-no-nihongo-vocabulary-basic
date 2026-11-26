// Minimal pointer/touch swipe binding for the 極速是非 card. Presentation only:
// it reads the DOM events and calls the two callbacks; the scoring guard lives
// in the engine and the component. Buttons are the accessible fallback and use
// the same callbacks, so a question can only fire once.
export function attachSwipe(el, { onLeft, onRight }) {
  if (!el) return () => {}
  let startX = null
  const start = (event) => {
    startX = event.touches?.[0]?.clientX ?? event.clientX
  }
  const end = (event) => {
    if (startX == null) return
    const x = event.changedTouches?.[0]?.clientX ?? event.clientX
    const dx = x - startX
    startX = null
    if (dx > 60) onRight()
    else if (dx < -60) onLeft()
  }
  el.addEventListener('touchstart', start, { passive: true })
  el.addEventListener('touchend', end, { passive: true })
  el.addEventListener('mousedown', start)
  el.addEventListener('mouseup', end)
  return () => {
    el.removeEventListener('touchstart', start)
    el.removeEventListener('touchend', end)
    el.removeEventListener('mousedown', start)
    el.removeEventListener('mouseup', end)
  }
}
