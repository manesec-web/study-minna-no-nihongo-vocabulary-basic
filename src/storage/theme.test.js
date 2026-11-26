import { describe, expect, it } from 'vitest'
import { THEME_KEY, LEGACY_THEME_KEY } from '../ui/theme.js'
import { createThemeStorage } from './theme.js'

function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  }
}

describe('theme storage', () => {
  it('uses a project-prefixed key within the 64-byte limit', () => {
    expect(THEME_KEY).toBe('study-minna-no-nihongo-vocabulary-basic-theme')
    expect(LEGACY_THEME_KEY).toBe('words-theme')
    expect(THEME_KEY.length).toBeLessThanOrEqual(64)
  })

  it('round-trips a choice', () => {
    const storage = fakeStorage()
    const theme = createThemeStorage({ storage })
    expect(theme.load()).toBe(null)
    expect(theme.save('dark')).toBe(true)
    expect(theme.load()).toBe('dark')
    expect(storage.data.has(THEME_KEY)).toBe(true)
  })

  it('treats junk and failures as "no choice"', () => {
    expect(createThemeStorage({ storage: fakeStorage({ [THEME_KEY]: 'sepia' }) }).load()).toBe(null)
    expect(createThemeStorage({ storage: null }).load()).toBe(null)
    const broken = {
      getItem() {
        throw new Error('denied')
      },
      setItem() {
        throw new Error('denied')
      },
      removeItem() {
        throw new Error('denied')
      },
    }
    const theme = createThemeStorage({ storage: broken })
    expect(theme.load()).toBe(null)
    expect(theme.save('dark')).toBe(false)
  })

  it('refuses to store an unknown value', () => {
    const storage = fakeStorage()
    const theme = createThemeStorage({ storage })
    expect(theme.save('sepia')).toBe(false)
    expect(storage.data.has(THEME_KEY)).toBe(false)
  })

  it('migrates a legacy key and then stops using it', () => {
    const storage = fakeStorage({ [LEGACY_THEME_KEY]: 'dark' })
    const theme = createThemeStorage({ storage })
    expect(theme.load()).toBe('dark')
    expect(storage.getItem(THEME_KEY)).toBe('dark')
    expect(storage.getItem(LEGACY_THEME_KEY)).toBe(null)
  })

  it('keeps the new key when both are present and drops the legacy key', () => {
    const storage = fakeStorage({ [THEME_KEY]: 'light', [LEGACY_THEME_KEY]: 'dark' })
    const theme = createThemeStorage({ storage })
    expect(theme.load()).toBe('light')
    expect(storage.getItem(LEGACY_THEME_KEY)).toBe(null)
  })

  it('removes a leftover legacy key on save', () => {
    const storage = fakeStorage({ [LEGACY_THEME_KEY]: 'light' })
    const theme = createThemeStorage({ storage })
    expect(theme.save('dark')).toBe(true)
    expect(storage.getItem(THEME_KEY)).toBe('dark')
    expect(storage.getItem(LEGACY_THEME_KEY)).toBe(null)
  })
})
