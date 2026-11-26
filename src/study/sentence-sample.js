// Pick a stable random sample of example sentences for one reader entry.
// The sample is derived from the study run's seed plus the entry's lesson
// and index, so paging away and back, or opening settings, does not reshuffle.
// A new 開始 draws a new seed and therefore a new sample.

export const SENTENCE_SAMPLE_SIZE = 5

// mulberry32, a small 32-bit generator so a test can fix the seed.
export function mulberry32(seed) {
  let a = seed >>> 0
  return function random() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function entryRandom(runSeed, lesson, index) {
  const mixed =
    (Math.imul((runSeed >>> 0) ^ Math.imul(Number(lesson) || 0, 0x9e3779b9), 0x85ebca6b) +
      Math.imul(Number(index) || 0, 0xc2b2ae35)) >>>
    0
  return mulberry32(mixed)
}

// Unique indices in `[0, length)`, at most `count`, then sorted so the
// sample keeps the dictionary order of the source list.
export function sampleIndices(length, count = SENTENCE_SAMPLE_SIZE, random = Math.random) {
  const total = Math.max(0, Math.floor(Number(length) || 0))
  const take = Math.min(Math.max(0, Math.floor(Number(count) || 0)), total)
  const indices = Array.from({ length: total }, (_, at) => at)
  for (let i = 0; i < take; i += 1) {
    const j = i + Math.floor(random() * (total - i))
    const swap = indices[i]
    indices[i] = indices[j]
    indices[j] = swap
  }
  return indices.slice(0, take).sort((a, b) => a - b)
}

export function pickSentences(sentences, count = SENTENCE_SAMPLE_SIZE, random = Math.random) {
  const list = Array.isArray(sentences) ? sentences : []
  return sampleIndices(list.length, count, random).map((at) => list[at])
}

export function pickEntrySentences(
  sentences,
  item,
  runSeed,
  count = SENTENCE_SAMPLE_SIZE,
) {
  const random = entryRandom(runSeed, item?.lesson, item?.index)
  return pickSentences(sentences, count, random)
}
