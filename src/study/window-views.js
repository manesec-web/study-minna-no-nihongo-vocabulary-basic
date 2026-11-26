// Turns the paging window into what each view renders. One entry per slot, in
// slot order, so the view only loops and prints: the slot's position on screen
// comes from `windowOffset`, its identity from `slotKey`, and its contents from
// the item at that list position — never from "the current item". That is what
// keeps a neighbour showing its own word instead of a copy of the current one.
import { windowGap, windowOffset, slotKey, CURRENT_SLOT } from '../ui/window.js'
import { speechLabels, tagLabels } from '../dict/labels.js'
import { sentenceParts } from './highlight.js'
import { hiraganaOnlyText } from '../dict/ruby.js'
import { pickEntrySentences } from './sentence-sample.js'

// The frame both views share: where the slot sits and which item it holds.
// `slots` is the row itself — the state the views keep between turns — so this
// only maps positions to view data and never rebuilds the row.
function frames(items, slots) {
  return slots.map((at, slot) => ({
    slot,
    at,
    key: slotKey(at, slot),
    offset: windowOffset(slot),
    gap: windowGap(slot),
    current: slot === CURRENT_SLOT,
    item: at === null ? null : items[at],
  }))
}

function displayWord(vol) {
  return typeof vol?.kanji === 'string' ? vol.kanji : (vol?.japanese ?? '')
}

// The cards' face and back per entry. Derived once here so the view only prints.
export function cardEntries(items, slots, library, settings) {
  const direction = settings?.direction ?? 'jp-zh'
  const showReading = settings?.showReading !== false
  const showStartReading = settings?.showStartReading !== false
  const showHiraganaOnly = settings?.showHiraganaOnly === true
  return frames(items, slots).map((frame) => {
    const item = frame.item
    if (!item) return { ...frame, face: null, back: null }
    const vol = library?.entry ? library.entry(item) : null
    if (!vol) return { ...frame, face: null, back: null }
    const word = displayWord(vol)
    const hasKanji = typeof vol.kanji === 'string'
    const reading = vol.japanese ?? ''
    const chinese = vol.chinese ?? ''
    const speech = speechLabels(vol.speech)

    const back = {
      word,
      reading,
      ruby: hasKanji && showReading,
      chinese,
      speech,
      lesson: item.lesson,
    }

    if (direction === 'zh-jp') {
      return {
        ...frame,
        face: { word: chinese, reading: '', ruby: false, prompt: '日文是什麼？' },
        back,
      }
    }
    if (showHiraganaOnly) {
      return {
        ...frame,
        face: {
          word: hiraganaOnlyText(reading, word),
          reading: '',
          ruby: false,
          prompt: '中文是什麼？',
        },
        back,
      }
    }
    return {
      ...frame,
      face: {
        word,
        reading,
        ruby: hasKanji && showStartReading && showReading,
        prompt: '中文是什麼？',
      },
      back,
    }
  })
}

function mappedSentences(list, word) {
  return list.map((sentence) => ({
    japanese: sentence?.japanese ?? '',
    chinese: sentence?.chinese ?? '',
    parts: sentenceParts(sentence, word),
  }))
}

// The reader's one block per entry. Derived once here so the view only prints.
// `runSeed` is the study run's seed from `study.start`. The five-sentence
// sample is a pure function of that seed and the entry, so the view never
// shuffles on its own.
export function readerEntries(items, slots, library, settings, runSeed = 0) {
  const showReading = settings?.showReading !== false
  const showExamples = settings?.showExamples !== false
  return frames(items, slots).map((frame) => {
    const item = frame.item
    if (!item) return { ...frame, entry: null }
    const vol = library?.entry ? library.entry(item) : null
    if (!vol) return { ...frame, entry: null }
    const word = displayWord(vol)
    const allSentences = Array.isArray(vol.sentence) ? vol.sentence : []
    return {
      ...frame,
      entry: {
        lesson: item.lesson,
        index: item.index,
        kanji: vol.kanji ?? null,
        japanese: vol.japanese ?? '',
        chinese: vol.chinese ?? '',
        displayWord: word,
        note: typeof vol.note === 'string' ? vol.note : null,
        kanjiNote: vol.kanji_note && typeof vol.kanji_note === 'object' ? vol.kanji_note : null,
        speech: speechLabels(vol.speech),
        tags: tagLabels(vol.tags),
        showReading,
        sentences: showExamples
          ? mappedSentences(pickEntrySentences(allSentences, item, runSeed), word)
          : [],
      },
    }
  })
}
