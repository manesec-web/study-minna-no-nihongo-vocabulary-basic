// 單詞目錄 rows: the frozen run grouped by lesson, with a search that matches
// the displayed word, its kana reading, or the lesson number.
//
// The run order is lesson-ascending and keeps the file order inside a lesson,
// so a new group starts whenever the lesson changes. Each row keeps the run
// index the jump command needs, the display word, and the highlight runs the
// view prints — the view never re-derives a row.
import { alignReading } from '../dict/ruby.js'
import { katakanaToHiragana, normalizeProlonged, romajiToKana } from '../dict/romaji.js'

const ROMAJI = /^[a-zA-Zāīūēō']+$/

function normalizeJapanese(text) {
  return normalizeProlonged(katakanaToHiragana(text))
}

function isAllKana(text) {
  const chars = Array.from(text)
  return (
    chars.length > 0 &&
    chars.every((char) => {
      const code = char.codePointAt(0)
      return (code >= 0x3041 && code <= 0x3096) || char === 'ー'
    })
  )
}

// Every occurrence of `needle` in `text`, as [start, end) code-point ranges.
function matchRanges(text, needle) {
  const source = Array.from(text)
  const target = Array.from(needle)
  const ranges = []
  if (target.length === 0) return ranges
  for (let at = 0; at + target.length <= source.length; at += 1) {
    let equal = true
    for (let offset = 0; offset < target.length; offset += 1) {
      if (source[at + offset] !== target[offset]) {
        equal = false
        break
      }
    }
    if (equal) ranges.push([at, at + target.length])
  }
  return ranges
}

function mergeRanges(ranges) {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const merged = []
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1]
    if (last && start <= last[1]) {
      if (end > last[1]) last[1] = end
    } else {
      merged.push([start, end])
    }
  }
  return merged
}

// Split `text` into plain and highlighted runs around the given code-point
// ranges. The runs concatenate back to `text` with no characters lost.
export function highlightSegments(text, ranges) {
  const chars = Array.from(text)
  const merged = mergeRanges(ranges)
  if (merged.length === 0) return [{ text, highlight: false }]

  const segments = []
  let cursor = 0
  for (const [start, end] of merged) {
    if (start > cursor) segments.push({ text: chars.slice(cursor, start).join(''), highlight: false })
    segments.push({ text: chars.slice(start, end).join(''), highlight: true })
    cursor = end
  }
  if (cursor < chars.length) segments.push({ text: chars.slice(cursor).join(''), highlight: false })
  return segments.length ? segments : [{ text, highlight: false }]
}

// Map every reading character to the displayed-word character(s) that carry
// it, so a kana/romaji match inside the reading highlights the right part of
// the kanji-and-kana word. One span is a kana character (1:1); a kanji run is
// one span covering the whole run and its whole reading slice.
function readingSpans(vol, japanese) {
  const volChars = Array.from(vol)
  const readingChars = Array.from(japanese)
  if (volChars.length === 0 || readingChars.length === 0) {
    return [{ volStart: 0, volEnd: volChars.length, readingStart: 0, readingEnd: readingChars.length }]
  }
  const aligned = alignReading(vol, japanese)
  if (!aligned.ok) {
    return [{ volStart: 0, volEnd: volChars.length, readingStart: 0, readingEnd: readingChars.length }]
  }
  const spans = []
  let volAt = 0
  let readingAt = 0
  for (const token of aligned.tokens) {
    const volLen = Array.from(token.text).length
    const readingLen = token.ruby == null ? volLen : Array.from(token.ruby).length
    spans.push({
      volStart: volAt,
      volEnd: volAt + volLen,
      readingStart: readingAt,
      readingEnd: readingAt + readingLen,
    })
    volAt += volLen
    readingAt += readingLen
  }
  return spans
}

// The code-point ranges of the display word that a query highlights, or [] when
// it does not match. A Latin query is converted to kana first; a kana query
// also matches the reading; a kanji/katakana query matches the word literally.
export function matchWordRanges(query, display, reading) {
  const needle = (query ?? '').trim()
  const displayText = typeof display === 'string' ? display : ''
  if (!needle || !displayText) return []

  const ranges = []
  if (!ROMAJI.test(needle)) ranges.push(...matchRanges(displayText, needle))

  const kanaNeedle = ROMAJI.test(needle) ? romajiToKana(needle) : normalizeJapanese(needle)
  if (kanaNeedle && isAllKana(kanaNeedle)) {
    const readingText = typeof reading === 'string' ? reading : ''
    const readingNorm = normalizeJapanese(readingText)
    const spans = readingSpans(displayText, readingText)
    for (const [readStart, readEnd] of matchRanges(readingNorm, kanaNeedle)) {
      for (const span of spans) {
        if (span.readingStart < readEnd && readStart < span.readingEnd) {
          ranges.push([span.volStart, span.volEnd])
        }
      }
    }
  }
  return mergeRanges(ranges)
}

function displayWord(vol) {
  return typeof vol?.kanji === 'string' ? vol.kanji : (vol?.japanese ?? '')
}

function buildGroups(items, library, currentIndex, needle) {
  const searching = needle !== ''
  const groups = []
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]
    const vol = library?.entry ? library.entry(item) : null
    if (!vol) continue
    const lesson = item.lesson
    const word = displayWord(vol)
    const reading = typeof vol.japanese === 'string' ? vol.japanese : ''

    let ranges = []
    if (searching) {
      ranges = matchWordRanges(needle, word, reading)
      const lessonMatch = String(lesson).includes(needle)
      if (ranges.length === 0 && !lessonMatch) continue
    }

    const row = {
      index,
      lesson,
      word,
      parts: highlightSegments(word, ranges),
      current: index === currentIndex,
    }
    let group = groups[groups.length - 1]
    if (!group || group.lesson !== lesson) {
      group = { lesson, rows: [] }
      groups.push(group)
    }
    group.rows.push(row)
  }
  return groups
}

// The searched list: only rows that match the query (word, reading, or lesson
// number) survive, and a lesson with no surviving row leaves no heading. An
// empty query returns the full list.
export function filterTocGroups(items, library, currentIndex = -1, query = '') {
  return buildGroups(items, library, currentIndex, (query ?? '').trim())
}
