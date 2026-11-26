// Presentation helper for grid cells: choose a font-size class from the text
// length so a long word stays inside a tight grid cell without clipping. The
// view renders the class; the sizing rules stay out of the .vue file.
export function cellFontClass(text) {
  const length = Array.from(text ?? '').length
  if (length <= 2) return 'cell-font--short'
  if (length <= 4) return 'cell-font--medium'
  return 'cell-font--long'
}
