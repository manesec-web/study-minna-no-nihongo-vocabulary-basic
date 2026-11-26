// Word faces for the quiz modes. A face is one of 日語 (jp), 中文 (zh), or
// 平假名 (kana). The dictionary stores no usable image (every `image` is null),
// so 圖片 is never produced here; a mode that mentions 圖片 simply uses these
// three forms instead. Readings come from the existing ruby helpers — none are
// invented.
import { toHiragana } from '../../dict/ruby.js'

export const FACE_LABELS = { jp: '日語', zh: '中文', kana: '平假名' }
export const FACES = ['jp', 'zh', 'kana']

export function displayWord(vol) {
  return typeof vol?.kanji === 'string' ? vol.kanji : (vol?.japanese ?? '')
}

// The reading as hiragana. Prefer the stored `japanese`, then fall back to the
// display word; katakana is transcribed, never invented.
export function readingKana(vol) {
  const reading = vol?.japanese ?? ''
  const base = reading !== '' ? reading : displayWord(vol)
  return toHiragana(base)
}

export function splitKana(vol) {
  return Array.from(readingKana(vol))
}

// One derived, render-ready face record. It keeps the original reference so
// modes can report identity without holding whole word bodies in the session.
export function wordFace(ref, vol) {
  return {
    ref,
    jp: displayWord(vol),
    zh: vol?.chinese ?? '',
    kana: readingKana(vol),
    japanese: vol?.japanese ?? '',
    kanji: typeof vol?.kanji === 'string' ? vol.kanji : null,
    hasKanji: typeof vol?.kanji === 'string',
  }
}

export function faceOf(word, face) {
  if (face === 'jp') return word.jp
  if (face === 'zh') return word.zh
  if (face === 'kana') return word.kana
  return word.jp
}

export function faceLabel(face) {
  return FACE_LABELS[face] ?? face
}

export function sameRef(a, b) {
  return a?.lesson === b?.lesson && a?.index === b?.index
}
