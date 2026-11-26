import { describe, expect, it } from 'vitest'
import { DRAW_TIMINGS, playDrawCard } from './draw-animation.js'

function classList(log) {
  const set = new Set()
  return {
    add: (name) => {
      set.add(name)
      log.push(`add:${name}`)
    },
    remove: (name) => {
      set.delete(name)
      log.push(`remove:${name}`)
    },
    contains: (name) => set.has(name),
  }
}

function makeFakes(log) {
  const inner = { style: {} }
  const name = { textContent: '' }
  const cloneInner = { style: {} }
  const cloneName = { textContent: '' }

  const card = {
    style: {},
    classList: classList(log),
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 80, height: 106 }),
    querySelector: (sel) => (sel === '.draw-card-inner' ? inner : sel === '.draw-card-name' ? name : null),
    cloneNode: () => ({
      className: '',
      style: {},
      classList: classList(log),
      setAttribute: () => {},
      querySelector: (sel) => (sel === '.draw-card-inner' ? cloneInner : sel === '.draw-card-name' ? cloneName : null),
      remove: () => log.push('remove:stage'),
    }),
  }

  const board = { classList: classList(log) }
  const overlay = {
    className: '',
    style: {},
    classList: classList(log),
    remove: () => log.push('remove:overlay'),
  }
  const container = { append: (...els) => log.push(`append:${els.length}`) }

  return { card, inner, name, board, overlay, container, cloneInner, cloneName }
}

describe('3×3 draw reveal animation', () => {
  it('runs the full sequence and completes only after the card is back in place', async () => {
    const log = []
    const f = makeFakes(log)
    const animate = async (_el, frames) => log.push(`animate:${frames.length}`)
    const wait = async (ms) => log.push(`wait:${ms}`)
    const nextFrame = async () => log.push('frame')

    await playDrawCard({
      board: f.board,
      card: f.card,
      container: f.container,
      modeLabel: '選擇題',
      onComplete: () => log.push('complete'),
      animate,
      wait,
      nextFrame,
      createElement: () => f.overlay,
      viewport: () => ({ width: 390, height: 844 }),
    })

    expect(f.name.textContent).toBe('選擇題')
    expect(f.inner.style.transform).toBe('rotateY(180deg)')
    expect(f.card.classList.contains('draw-card--done')).toBe(true)
    expect(log).toEqual([
      'add:draw-board--busy',
      'append:2',
      'wait:20',
      'add:draw-overlay--visible',
      'animate:3',
      'animate:3',
      `wait:${DRAW_TIMINGS.hold}`,
      'animate:2',
      'animate:2',
      'add:draw-card--done',
      'remove:stage',
      'remove:overlay',
      'remove:draw-board--busy',
      'frame',
      'complete',
    ])
  })

  it('flips in place and skips the travel under reduced motion', async () => {
    const log = []
    const f = makeFakes(log)
    const nextFrame = async () => log.push('frame')

    await playDrawCard({
      board: f.board,
      card: f.card,
      container: f.container,
      modeLabel: '翻卡配對',
      onComplete: () => log.push('complete'),
      reducedMotion: true,
      nextFrame,
    })

    expect(f.inner.style.transform).toBe('rotateY(180deg)')
    expect(f.card.classList.contains('draw-card--done')).toBe(true)
    expect(log).toEqual(['add:draw-card--done', 'frame', 'complete'])
  })

  it('does not complete synchronously in the animated path', async () => {
    let completed = false
    const f = makeFakes([])

    const pending = playDrawCard({
      board: f.board,
      card: f.card,
      container: f.container,
      modeLabel: '選擇題',
      onComplete: () => (completed = true),
      animate: async () => {},
      wait: () => new Promise((resolve) => setTimeout(resolve, 0)),
      nextFrame: async () => {},
      createElement: () => f.overlay,
      viewport: () => ({ width: 390, height: 844 }),
    })

    expect(completed).toBe(false)
    await pending
    expect(completed).toBe(true)
  })
})
