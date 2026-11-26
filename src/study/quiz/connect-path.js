// Presentation helper for the 路徑連接 SVG overlay. The engine stores the path
// as grid cell indices; this function measures the live DOM cells and returns
// `points` in the board's local pixel space, so the line keeps hugging the cell
// centres after a resize. It never touches the session.
export function connectPathPoints(container, path) {
  if (!container || !Array.isArray(path) || path.length === 0) return ''
  const cells = Array.from(container.querySelectorAll('.connect-cell'))
  if (cells.length === 0) return ''
  const board = container.getBoundingClientRect()
  const points = []
  for (const index of path) {
    const el = cells[index]
    if (!el) return ''
    const rect = el.getBoundingClientRect()
    points.push({
      x: rect.left + rect.width / 2 - board.left,
      y: rect.top + rect.height / 2 - board.top,
    })
  }
  return points.map((p) => `${p.x},${p.y}`).join(' ')
}
