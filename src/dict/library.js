// In-memory dictionary library. Loads the verified IndexedDB copies once, then
// answers selection questions for the picker and item builders.
import { CommandError } from '../engine/errors.js'

export function createLibrary({ store, manifest } = {}) {
  let loaded = false
  let lessons = []

  async function load() {
    if (loaded) return summary()
    if (!store || !manifest) {
      throw new CommandError('library-missing', 'library dependencies are not configured')
    }
    const next = []
    for (const entry of manifest.files) {
      const bytes = await store.read(entry.name)
      if (!bytes) {
        throw new CommandError('library-missing', `dictionary file not in IndexedDB: ${entry.name}`, {
          file: entry.name,
        })
      }
      let vols
      try {
        const text = new TextDecoder().decode(bytes)
        vols = JSON.parse(text)?.[entry.id]?.vols
      } catch (error) {
        throw new CommandError('library-invalid', `cannot parse ${entry.name}: ${error.message}`, {
          file: entry.name,
        })
      }
      next.push({ lesson: lessonNumber(entry.id), vols: Array.isArray(vols) ? vols : [] })
    }
    lessons = next
    loaded = true
    return summary()
  }

  function summary() {
    return lessons.map(({ lesson, vols }) => ({
      lesson,
      hasEntries: vols.length > 0,
      count: vols.length,
    }))
  }

  function hasEntries(lesson) {
    const entry = lessons.find((item) => item.lesson === lesson)
    return Boolean(entry && entry.vols.length > 0)
  }

  function entryLessons() {
    return lessons.filter((entry) => entry.vols.length > 0).map((entry) => entry.lesson)
  }

  // Entries for the given lessons in lesson order, keeping the JSON order
  // inside each lesson. Each item keeps the lesson number and the word object.
  function getEntries(lessonNumbers) {
    const wanted = new Set(lessonNumbers)
    const result = []
    for (const entry of lessons) {
      if (!wanted.has(entry.lesson)) continue
      for (const vol of entry.vols) {
        result.push({ lesson: entry.lesson, vol })
      }
    }
    return result
  }

  function getVols(lesson) {
    const entry = lessons.find((item) => item.lesson === lesson)
    return entry ? entry.vols : []
  }

  function entry({ lesson, index } = {}) {
    const vols = getVols(lesson)
    return vols[index] ?? null
  }

  function lessonCount() {
    return lessons.length
  }

  return {
    load,
    summary,
    hasEntries,
    entryLessons,
    getEntries,
    getVols,
    entry,
    lessonCount,
  }
}

function lessonNumber(id) {
  const match = /^lesson_(\d+)$/.exec(String(id))
  return match ? Number(match[1]) : 0
}
