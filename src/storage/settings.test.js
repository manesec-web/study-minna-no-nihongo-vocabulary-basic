import { describe, expect, it } from 'vitest'
import { createSettingsStorage } from './settings.js'
import { SETTINGS_KEY, LEGACY_SETTINGS_KEY, defaultSettings } from '../dict/settings.js'

function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  }
}

describe('settings storage', () => {
  it('uses a project-prefixed key within the 64-byte limit', () => {
    expect(SETTINGS_KEY).toBe('study-minna-no-nihongo-vocabulary-basic-settings')
    expect(LEGACY_SETTINGS_KEY).toBe('words-settings')
    expect(SETTINGS_KEY.length).toBeLessThanOrEqual(64)
  })

  it('returns defaults when nothing is stored', () => {
    const storage = createSettingsStorage({ storage: fakeStorage() })
    expect(storage.load()).toEqual(defaultSettings())
  })

  it('restores a saved object', () => {
    const backing = fakeStorage()
    const storage = createSettingsStorage({ storage: backing })
    const settings = defaultSettings()
    settings.words.lessons = [2, 5]
    settings.words.showExamples = false
    expect(storage.save(settings)).toBe(true)
    expect(storage.load()).toEqual(settings)
    expect(backing.getItem(SETTINGS_KEY)).toBeTruthy()
    expect(backing.getItem(LEGACY_SETTINGS_KEY)).toBe(null)
  })

  it('resets to defaults when stored JSON is broken', () => {
    const storage = createSettingsStorage({ storage: fakeStorage({ [SETTINGS_KEY]: '{oops' }) })
    expect(storage.load()).toEqual(defaultSettings())
  })

  it('survives a storage that throws', () => {
    const storage = createSettingsStorage({
      storage: {
        getItem: () => {
          throw new Error('denied')
        },
        setItem: () => {
          throw new Error('denied')
        },
        removeItem: () => {
          throw new Error('denied')
        },
      },
    })
    expect(storage.load()).toEqual(defaultSettings())
    expect(storage.save(defaultSettings())).toBe(false)
  })

  it('migrates a legacy key and then stops using it', () => {
    const backing = fakeStorage({
      [LEGACY_SETTINGS_KEY]: JSON.stringify({ words: { lessons: [3], showExamples: false } }),
    })
    const storage = createSettingsStorage({ storage: backing })
    const settings = storage.load()
    expect(settings.words.lessons).toEqual([3])
    expect(settings.words.showExamples).toBe(false)
    expect(JSON.parse(backing.getItem(SETTINGS_KEY)).words.lessons).toEqual([3])
    expect(backing.getItem(LEGACY_SETTINGS_KEY)).toBe(null)
  })

  it('keeps the new key when both are present and drops the legacy key', () => {
    const backing = fakeStorage({
      [SETTINGS_KEY]: JSON.stringify({ words: { lessons: [1] } }),
      [LEGACY_SETTINGS_KEY]: JSON.stringify({ words: { lessons: [9] } }),
    })
    const storage = createSettingsStorage({ storage: backing })
    expect(storage.load().words.lessons).toEqual([1])
    expect(backing.getItem(LEGACY_SETTINGS_KEY)).toBe(null)
  })
})

describe('stale analytics keys', () => {
  it('drops a stored analytics section and writes the cleaned settings back', () => {
    const backing = fakeStorage({
      [SETTINGS_KEY]: JSON.stringify({
        words: { lessons: [2] },
        analytics: { containerId: 'GTM-STALE01', measurementId: 'G-STALE1234' },
      }),
    })
    const storage = createSettingsStorage({ storage: backing })
    const settings = storage.load()
    expect(settings.words.lessons).toEqual([2])
    expect(settings).not.toHaveProperty('analytics')
    const written = JSON.parse(backing.getItem(SETTINGS_KEY))
    expect(written).not.toHaveProperty('analytics')
    expect(written.words.lessons).toEqual([2])
  })
})
