import { describe, expect, it } from 'vitest'
import { isTheme, nextTheme, systemTheme, themeState, THEME_KEY } from './theme.js'

describe('theme rules', () => {
  it('uses the project-prefixed theme storage key', () => {
    expect(THEME_KEY).toBe('study-minna-no-nihongo-vocabulary-basic-theme')
  })

  it('recognises only light and dark', () => {
    expect(isTheme('light')).toBe(true)
    expect(isTheme('dark')).toBe(true)
    expect(isTheme('blue')).toBe(false)
    expect(isTheme(null)).toBe(false)
  })

  it('maps the OS preference to a theme', () => {
    expect(systemTheme(true)).toBe('dark')
    expect(systemTheme(false)).toBe('light')
  })

  it('prefers a stored choice over the OS', () => {
    expect(themeState({ stored: 'dark', system: 'light' })).toEqual({ value: 'dark', source: 'user' })
    expect(themeState({ stored: 'light', system: 'dark' })).toEqual({ value: 'light', source: 'user' })
  })

  it('falls back to the OS when nothing is stored', () => {
    expect(themeState({ stored: null, system: 'dark' })).toEqual({ value: 'dark', source: 'system' })
  })

  it('ignores an unrecognised stored value', () => {
    expect(themeState({ stored: 'sepia', system: 'dark' })).toEqual({ value: 'dark', source: 'system' })
  })

  it('flips between the two themes', () => {
    expect(nextTheme('dark')).toBe('light')
    expect(nextTheme('light')).toBe('dark')
    expect(nextTheme('unknown')).toBe('dark')
  })
})
