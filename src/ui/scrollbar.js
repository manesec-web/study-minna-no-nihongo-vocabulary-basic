// Custom page scrollbar geometry. The browser's own bar is hidden, so this
// module works out how long the drawn thumb is, where it sits, and where the
// track lives. Pure: no DOM, no timers, so the numbers can be unit tested.
export const SCROLLBAR = {
  width: 4,
  inset: 3,
  edgeInset: 16,
  frameInset: 8,
  frameEdgeInset: 32,
  minThumb: 28,
  fadeDelay: 1000,
  fadeMs: 160,
  proximity: 24,
  hitX: 8,
  hitY: 6,
}

// Convert a thumb offset back to a scroll position. This is the inverse of
// thumbMetrics' offset calculation and is shared by page and list dragging.
export function scrollTopForThumbOffset({
  offset = 0,
  viewport = 0,
  content = 0,
  track = 0,
  length = 0,
} = {}) {
  const maxScroll = Math.max(0, content - viewport)
  const travel = Math.max(0, track - length)
  if (!(maxScroll > 0) || !(travel > 0)) return 0
  const clamped = Math.min(travel, Math.max(0, offset))
  return (clamped / travel) * maxScroll
}

export function dragScrollTop({ startOffset = 0, deltaY = 0, ...geometry } = {}) {
  return scrollTopForThumbOffset({ ...geometry, offset: startOffset + deltaY })
}

export function isNearPageThumb({
  x = 0,
  y = 0,
  viewportWidth = 0,
  viewportHeight = 0,
  right = SCROLLBAR.inset,
  edgeInset = SCROLLBAR.edgeInset,
  proximity = SCROLLBAR.proximity,
} = {}) {
  if (!(viewportWidth > 0) || !(viewportHeight > 0)) return false
  const thumbRight = viewportWidth - right
  const thumbLeft = thumbRight - SCROLLBAR.width
  return (
    x >= thumbLeft - proximity &&
    x <= thumbRight + proximity &&
    y >= edgeInset - proximity &&
    y <= viewportHeight - edgeInset + proximity
  )
}

export function trackHeight(viewportHeight, edgeInset = SCROLLBAR.edgeInset) {
  if (!(viewportHeight > 0)) return 0
  return Math.max(0, viewportHeight - edgeInset * 2)
}

// `track` is the drawable height, `viewport` the window height, `content` the
// page's scroll height. Nothing is drawn when the page already fits.
export function thumbMetrics({
  scrollTop = 0,
  viewport = 0,
  content = 0,
  track = 0,
  minThumb = SCROLLBAR.minThumb,
} = {}) {
  if (track <= 0 || viewport <= 0 || content <= viewport + 1) {
    return { visible: false, length: 0, offset: 0 }
  }
  const share = viewport / content
  const floor = Math.min(minThumb, track)
  const length = Math.min(track, Math.max(floor, track * share))
  const maxScroll = content - viewport
  const travel = track - length
  const progress = maxScroll > 0 ? scrollTop / maxScroll : 0
  const offset = Math.min(travel, Math.max(0, travel * progress))
  return {
    visible: true,
    length: Math.round(length * 100) / 100,
    offset: Math.round(offset * 100) / 100,
  }
}

export function isFramed(viewportWidth = 0, columnRight = 0) {
  if (!(viewportWidth > 0)) return false
  const edge = columnRight > 0 ? Math.min(columnRight, viewportWidth) : viewportWidth
  return Math.max(0, viewportWidth - edge) > 0
}

export function rightInset(viewportWidth = 0, columnRight = 0, inset = SCROLLBAR.inset) {
  if (!(viewportWidth > 0)) return inset
  const edge = columnRight > 0 ? Math.min(columnRight, viewportWidth) : viewportWidth
  const margin = Math.max(0, viewportWidth - edge)
  const inside = margin > 0 ? SCROLLBAR.frameInset : inset
  return Math.round(margin + inside)
}

export function trackInset(viewportWidth = 0, columnRight = 0) {
  return isFramed(viewportWidth, columnRight) ? SCROLLBAR.frameEdgeInset : SCROLLBAR.edgeInset
}
