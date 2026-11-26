import { describe, expect, it } from 'vitest'
import { createGtm, GTAG_SCRIPT_URL, GTM_SCRIPT_URL } from './gtm.js'

function fakeDom(href = 'https://example.com/study-minna-no-nihongo-vocabulary-basic/') {
  const scripts = []
  const gtagCalls = []
  const doc = {
    head: {
      appendChild(node) {
        scripts.push(node)
      },
    },
    createElement(tag) {
      return {
        tag,
        attributes: {},
        setAttribute(name, value) {
          this.attributes[name] = value
        },
      }
    },
  }
  const win = {
    location: { href },
    gtag(...args) {
      gtagCalls.push(args)
    },
  }
  return { win, doc, scripts, gtagCalls }
}

describe('GTM container', () => {
  it('creates the dataLayer, pushes gtm.start and appends the async script', () => {
    const { win, doc, scripts } = fakeDom()
    const gtm = createGtm({ window: win, document: doc })
    expect(gtm.load('GTM-ABC123')).toBe(true)
    expect(win.dataLayer).toHaveLength(1)
    expect(win.dataLayer[0]).toMatchObject({ event: 'gtm.js' })
    expect(typeof win.dataLayer[0]['gtm.start']).toBe('number')
    expect(scripts).toHaveLength(1)
    expect(scripts[0].async).toBe(true)
    expect(scripts[0].src).toBe(`${GTM_SCRIPT_URL}GTM-ABC123`)
    expect(scripts[0].attributes['data-gtm-id']).toBe('GTM-ABC123')
  })

  it('never loads the same container twice', () => {
    const { win, doc, scripts } = fakeDom()
    const gtm = createGtm({ window: win, document: doc })
    gtm.load('GTM-ABC123')
    expect(gtm.load('GTM-ABC123')).toBe(false)
    expect(scripts).toHaveLength(1)
  })

  it('loads nothing for an invalid or empty ID', () => {
    const { win, doc, scripts } = fakeDom()
    const gtm = createGtm({ window: win, document: doc })
    expect(gtm.load('nope')).toBe(false)
    expect(gtm.load('')).toBe(false)
    expect(scripts).toHaveLength(0)
    expect(win.dataLayer).toBeUndefined()
  })
})

describe('gtag.js measurement', () => {
  it('queues js and config with send_page_view off, then loads the script once', () => {
    const { win, doc, scripts, gtagCalls } = fakeDom()
    const gtm = createGtm({ window: win, document: doc })
    expect(gtm.loadTag('G-ABC12345')).toBe(true)
    expect(gtagCalls[0][0]).toBe('js')
    expect(gtagCalls[1]).toEqual(['config', 'G-ABC12345', { send_page_view: false }])
    expect(scripts).toHaveLength(1)
    expect(scripts[0].src).toBe(`${GTAG_SCRIPT_URL}G-ABC12345`)
    expect(gtm.loadTag('G-ABC12345')).toBe(false)
    expect(scripts).toHaveLength(1)
  })

  it('loads nothing for an invalid or empty measurement ID', () => {
    const { win, doc, scripts, gtagCalls } = fakeDom()
    const gtm = createGtm({ window: win, document: doc })
    expect(gtm.loadTag('GTM-ABC123')).toBe(false)
    expect(gtm.loadTag('')).toBe(false)
    expect(scripts).toHaveLength(0)
    expect(gtagCalls).toHaveLength(0)
  })
})

describe('per-screen tracking', () => {
  it('pushes the dataLayer entry and the GA4 event for a later screen', () => {
    const { win, doc, gtagCalls } = fakeDom()
    const gtm = createGtm({ window: win, document: doc })
    gtm.loadTag('G-ABC12345')
    gtm.screen('home')
    gtm.screen('picker')
    expect(win.dataLayer.map((entry) => entry.screen_name)).toEqual(['home', 'picker'])
    expect(gtagCalls.at(-1)).toEqual([
      'event',
      'page_view',
      {
        screen_name: 'picker',
        page_title: '詞彙 · 大家の單詞',
        page_location: 'https://example.com/study-minna-no-nihongo-vocabulary-basic/#/picker',
      },
    ])
  })

  it('leaves the loading screen and the first home to the container', () => {
    const { win, doc, gtagCalls } = fakeDom()
    const gtm = createGtm({ window: win, document: doc })
    gtm.loadTag('G-ABC12345')
    const before = gtagCalls.length
    gtm.screen('loading')
    gtm.screen('home')
    expect(gtagCalls).toHaveLength(before)
    expect(win.dataLayer.map((entry) => entry.screen_name)).toEqual(['loading', 'home'])
  })

  it('reports a later return to home', () => {
    const { win, doc, gtagCalls } = fakeDom()
    const gtm = createGtm({ window: win, document: doc })
    gtm.loadTag('G-ABC12345')
    gtm.screen('home')
    gtm.screen('picker')
    gtm.screen('home')
    const last = gtagCalls.at(-1)
    expect(last[0]).toBe('event')
    expect(last[2]).toMatchObject({
      screen_name: 'home',
      page_location: 'https://example.com/study-minna-no-nihongo-vocabulary-basic/#/home',
    })
  })

  it('still pushes the dataLayer entry when no measurement ID loaded', () => {
    const { win, doc, gtagCalls } = fakeDom()
    const gtm = createGtm({ window: win, document: doc })
    expect(gtm.screen('picker')).toBe(false)
    expect(gtagCalls).toHaveLength(0)
    expect(win.dataLayer.at(-1).screen_name).toBe('picker')
  })

  it('survives a missing window', () => {
    const gtm = createGtm({ window: null, document: null })
    expect(gtm.load('GTM-ABC123')).toBe(false)
    expect(gtm.loadTag('G-ABC12345')).toBe(false)
    expect(gtm.screen('home')).toBe(false)
  })
})
