// Direction input for 單字貪食蛇: physical arrow keys / WASD plus a touch swipe
// on the board. Presentation only — it calls `onDir(value)` and never touches
// the session. The engine's direction queue is the single source of truth for
// reversal protection.
export function attachDirectionInput(el, onDir) {
  if (typeof window === 'undefined') return () => {}

  const onKeydown = (event) => {
    const key = event.key
    if (key.startsWith('Arrow')) event.preventDefault()
    const map = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      w: 'up',
      W: 'up',
      s: 'down',
      S: 'down',
      a: 'left',
      A: 'left',
      d: 'right',
      D: 'right',
    }
    if (map[key]) onDir(map[key])
  }

  let startX = null
  let startY = null
  const onTouchStart = (event) => {
    const t = event.touches?.[0]
    if (!t) return
    startX = t.clientX
    startY = t.clientY
  }
  const onTouchEnd = (event) => {
    const t = event.changedTouches?.[0]
    if (!t || startX == null || startY == null) return
    const dx = t.clientX - startX
    const dy = t.clientY - startY
    startX = null
    startY = null
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return
    if (Math.abs(dx) > Math.abs(dy)) onDir(dx > 0 ? 'right' : 'left')
    else onDir(dy > 0 ? 'down' : 'up')
  }

  window.addEventListener('keydown', onKeydown)
  if (el) {
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
  }
  return () => {
    window.removeEventListener('keydown', onKeydown)
    if (el) {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }
}
