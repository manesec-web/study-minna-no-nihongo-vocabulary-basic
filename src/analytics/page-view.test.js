import { describe, expect, it } from 'vitest'
import {
  SCREEN_TITLES,
  SITE_TITLE,
  isValidContainerId,
  isValidMeasurementId,
  normalizeContainerId,
  normalizeMeasurementId,
  pageTitle,
  pageViewPayload,
  screenPageLocation,
} from './page-view.js'
import { GTM_ID, GA4_ID } from '../config/analytics.js'

describe('repo analytics config', () => {
  it('ships empty IDs (disabled), or a valid one', () => {
    expect(GTM_ID).toBeTypeOf('string')
    expect(GA4_ID).toBeTypeOf('string')
    expect(GTM_ID === '' || isValidContainerId(GTM_ID)).toBe(true)
    expect(GA4_ID === '' || isValidMeasurementId(GA4_ID)).toBe(true)
  })

  it('ships both IDs empty', () => {
    expect(GTM_ID).toBe('')
    expect(GA4_ID).toBe('')
  })
})

describe('container ID', () => {
  it('trims and uppercases a typed ID', () => {
    expect(normalizeContainerId('  gtm-abc123 ')).toBe('GTM-ABC123')
  })

  it('rejects anything that is not a GTM container', () => {
    expect(normalizeContainerId('')).toBeNull()
    expect(normalizeContainerId('GTM-')).toBeNull()
    expect(normalizeContainerId('GTM-ABC')).toBeNull()
    expect(normalizeContainerId('GTM-ABC123-EXTRA')).toBeNull()
    expect(normalizeContainerId('G-ABC123')).toBeNull()
    expect(normalizeContainerId(42)).toBeNull()
    expect(normalizeContainerId(null)).toBeNull()
  })
})

describe('measurement ID', () => {
  it('trims and uppercases a typed ID', () => {
    expect(normalizeMeasurementId('  g-abc12345 ')).toBe('G-ABC12345')
  })

  it('rejects anything that is not a GA4 measurement', () => {
    expect(normalizeMeasurementId('')).toBeNull()
    expect(normalizeMeasurementId('G-')).toBeNull()
    expect(normalizeMeasurementId('GTM-ABC123')).toBeNull()
    expect(normalizeMeasurementId(42)).toBeNull()
  })
})

describe('page titles', () => {
  it('names the site alone on home and the screen first elsewhere', () => {
    expect(SITE_TITLE).toBe('大家の單詞')
    expect(pageTitle('home')).toBe(SITE_TITLE)
    expect(pageTitle('reader')).toBe('單詞 · 大家の單詞')
    expect(pageTitle('loading')).toBe('載入中 · 大家の單詞')
  })

  it('covers every screen id', () => {
    expect(Object.keys(SCREEN_TITLES)).toEqual([
      'loading',
      'home',
      'picker',
      'reader',
      'toc',
      'glyph',
      'card',
      'quiz',
      'quiz-play',
      'settings',
    ])
  })
})

describe('screen page location', () => {
  it('names the screen in the URL fragment and replaces an old one', () => {
    expect(screenPageLocation('https://example.com/app/?a=1#/reader', 'card')).toBe(
      'https://example.com/app/?a=1#/card',
    )
    expect(screenPageLocation('https://example.com/app/', 'home')).toBe(
      'https://example.com/app/#/home',
    )
  })

  it('survives a missing URL', () => {
    expect(screenPageLocation('', 'reader')).toBe('')
    expect(screenPageLocation(null, 'reader')).toBe('')
  })
})

describe('page view payload', () => {
  it('carries the event, screen, title and URL', () => {
    expect(pageViewPayload('settings', 'https://example.com/x/')).toEqual({
      event: 'page_view',
      screen_name: 'settings',
      page_title: '設定 · 大家の單詞',
      page_location: 'https://example.com/x/#/settings',
    })
  })
})
