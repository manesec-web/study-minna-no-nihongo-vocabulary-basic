// Keep a one-finger vertical drag from rubber-banding the viewport on iOS.
// CSS `overscroll-behavior` handles modern Chrome/Android and newer Safari;
// older Safari needs a cancelable touchmove at the scrolling boundary.
//
// This deliberately is NOT a document-wide `preventDefault()` and NOT a fixed
// body. Long dictionary pages keep ordinary scrolling and momentum, and
// horizontal card/reader swipes stay live.

function canConsume(scrollTop, clientHeight, scrollHeight, deltaY) {
  const max = Math.max(0, scrollHeight - clientHeight)
  if (deltaY > 0) return scrollTop > deltaY
  if (deltaY < 0) return max - scrollTop > -deltaY
  return true
}

function settleAtBoundary(node, deltaY) {
  if (!node) return
  const max = Math.max(0, node.scrollHeight - node.clientHeight)
  node.scrollTop = deltaY > 0 ? 0 : max
}

export function createScrollGuard({
  document: doc = globalThis.document,
  view = globalThis.window,
  getStyle = globalThis.getComputedStyle,
} = {}) {
  let attached = false
  let scroller = null
  let startX = null
  let startY = null
  let lastY = null
  let axis = null
  let multiTouch = false

  function reset() {
    scroller = null
    startX = null
    startY = null
    lastY = null
    axis = null
    multiTouch = false
  }

  function rootScroller() {
    const root = doc.scrollingElement ?? doc.documentElement
    if (!root) return null
    return {
      scrollTop: root.scrollTop,
      clientHeight: root.clientHeight || view.innerHeight,
      scrollHeight: root.scrollHeight,
      element: root,
    }
  }

  function findScroller(target) {
    let node = target?.nodeType === 1 ? target : target?.parentElement
    while (node && node !== doc.body && node !== doc.documentElement) {
      const style = getStyle?.(node)
      const overflowY = style?.overflowY ?? style?.overflow ?? ''
      const scrollable = /^(auto|scroll|overlay)$/.test(overflowY)
      if (scrollable && node.scrollHeight > node.clientHeight + 1) {
        return {
          scrollTop: node.scrollTop,
          clientHeight: node.clientHeight,
          scrollHeight: node.scrollHeight,
          element: node,
        }
      }
      node = node.parentElement
    }
    return rootScroller()
  }

  function refreshScroller(node) {
    if (!node || node === doc.scrollingElement || node === doc.documentElement) {
      scroller = rootScroller()
      return
    }
    scroller = {
      scrollTop: node.scrollTop,
      clientHeight: node.clientHeight,
      scrollHeight: node.scrollHeight,
      element: node,
    }
  }

  function onStart(event) {
    reset()
    if (event.touches?.length !== 1) {
      multiTouch = true
      return
    }
    const touch = event.touches[0]
    startX = touch.clientX
    startY = touch.clientY
    lastY = touch.clientY
    scroller = findScroller(event.target)
  }

  function onMove(event) {
    if (event.touches?.length !== 1) {
      multiTouch = true
      return
    }
    if (multiTouch || event.cancelable === false) return
    if (startY === null || lastY === null) return
    const touch = event.touches[0]
    const y = touch.clientY
    const deltaY = y - lastY
    lastY = y
    if (axis === null) {
      const dx = touch.clientX - startX
      const dy = y - startY
      if (Math.max(Math.abs(dx), Math.abs(dy)) >= 4) {
        axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x'
      }
    }
    if (axis !== 'y' || deltaY === 0) return

    if (!scroller) return
    refreshScroller(scroller.element)
    if (canConsume(scroller.scrollTop, scroller.clientHeight, scroller.scrollHeight, deltaY)) {
      return
    }
    event.preventDefault()
    settleAtBoundary(scroller.element, deltaY)
  }

  function onEnd(event) {
    if (event.touches?.length !== 1) reset()
  }

  function onCancel() {
    reset()
  }

  function attach() {
    if (attached || !doc?.addEventListener) return
    doc.addEventListener('touchstart', onStart, { passive: true })
    doc.addEventListener('touchmove', onMove, { passive: false })
    doc.addEventListener('touchend', onEnd, { passive: true })
    doc.addEventListener('touchcancel', onCancel, { passive: true })
    attached = true
  }

  function detach() {
    if (!attached) return
    doc.removeEventListener('touchstart', onStart)
    doc.removeEventListener('touchmove', onMove)
    doc.removeEventListener('touchend', onEnd)
    doc.removeEventListener('touchcancel', onCancel)
    attached = false
    reset()
  }

  return { attach, detach }
}
