// 字形對照 detail page: the three-column row (簡 繁 日). Pure — no DOM.
// The Simplified column is produced by opencc-js, never typed by hand, using
// Taiwan-standard Traditional Chinese -> Mainland Simplified (`tw` -> `cn`).
// `tw` keeps 台 as 台, matching the reader's "do not rewrite 台 as 臺" rule.
import OpenCC from 'opencc-js/t2cn'

let converter = null

function traditionalToSimplified() {
  if (!converter) {
    converter = OpenCC.Converter({ from: 'tw', to: 'cn' })
  }
  return converter
}

export function simplifiedOf(zh) {
  if (typeof zh !== 'string' || zh === '') return ''
  try {
    return traditionalToSimplified()(zh)
  } catch {
    // opencc-js works on plain strings; a defensive fallback keeps a bad glyph
    // from ever breaking the page.
    return ''
  }
}

// Maps one `kanji_note.details[]` entry to the table's three cells. `zh` is
// the Traditional side (繁) and `jp` is the Japanese side (日). When `zh` is
// null (和製字 / kokuji) the Simplified and Traditional cells stay empty; the
// Japanese cell still shows `jp`.
export function glyphRow(detail) {
  const zh = detail && typeof detail.zh === 'string' && detail.zh !== '' ? detail.zh : null
  const jp = detail && typeof detail.jp === 'string' ? detail.jp : ''
  return {
    simplified: zh ? simplifiedOf(zh) : '',
    traditional: zh ?? '',
    japanese: jp,
    hasTraditional: zh !== null,
  }
}
