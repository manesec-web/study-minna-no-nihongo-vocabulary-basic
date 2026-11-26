// Reveal animation for the 3×3 隨機模式 draw. This is presentational: it never
// touches the session and never dispatches. The view calls `playDrawCard` on a
// card tap and passes `onComplete`, which is the only place `quiz.tap` runs —
// after the fly-to-centre + 3D flip, the hold, and the return have finished.
//
// Reduced motion skips the travel and flips the card in place so tests and
// assistive tools are not stuck waiting on an animation.

export const DRAW_TIMINGS = {
  move: 1050,
  flip: 920,
  hold: 1100,
  return: 700,
  fade: 600,
}

const EASE_MOVE = 'cubic-bezier(.2,.75,.25,1)'
const EASE_FLIP = 'cubic-bezier(.45,.05,.2,1)'
const EASE_RETURN = 'cubic-bezier(.22,.75,.25,1)'

function defaultAnimate(element, frames, options) {
  if (!element || typeof element.animate !== 'function') return Promise.resolve()
  try {
    const animation = element.animate(frames, options)
    return animation && typeof animation.finished?.then === 'function'
      ? animation.finished.catch(() => {})
      : Promise.resolve()
  } catch {
    return Promise.resolve()
  }
}

function defaultWait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function defaultNextFrame() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve())
    else setTimeout(resolve, 0)
  })
}

function defaultViewport() {
  return { width: window.innerWidth || 0, height: window.innerHeight || 0 }
}

function revealCard(card, modeLabel) {
  const inner = card?.querySelector?.('.draw-card-inner')
  const name = card?.querySelector?.('.draw-card-name')
  if (name && modeLabel) name.textContent = modeLabel
  if (inner) inner.style.transform = 'rotateY(180deg)'
  card?.classList?.add('draw-card--done')
}

function cleanup(stage, overlay, board) {
  stage?.remove?.()
  overlay?.remove?.()
  board?.classList?.remove('draw-board--busy')
}

export async function playDrawCard(options = {}) {
  const {
    board = null,
    card = null,
    modeLabel = '',
    onComplete = () => {},
    container = null,
    reducedMotion = false,
    shouldCancel = () => false,
    animate = defaultAnimate,
    wait = defaultWait,
    nextFrame = defaultNextFrame,
    viewport = defaultViewport,
    createElement = (tag) => document.createElement(tag),
  } = options

  if (!card || !board) {
    onComplete()
    return
  }

  if (reducedMotion) {
    revealCard(card, modeLabel)
    await nextFrame()
    if (!shouldCancel()) onComplete()
    return
  }

  board.classList.add('draw-board--busy')

  const originalRect = card.getBoundingClientRect()
  const overlay = createElement('div')
  overlay.className = 'draw-overlay'
  const stage = card.cloneNode(true)
  stage.className = 'draw-card draw-stage-card'
  stage.setAttribute('aria-hidden', 'true')

  const inner = stage.querySelector('.draw-card-inner')
  if (inner) inner.style.transform = 'rotateY(0deg)'

  stage.style.left = `${originalRect.left}px`
  stage.style.top = `${originalRect.top}px`
  stage.style.width = `${originalRect.width}px`
  stage.style.height = `${originalRect.height}px`

  const name = stage.querySelector('.draw-card-name')
  if (name && modeLabel) name.textContent = modeLabel

  container.append(overlay, stage)
  await wait(20)
  if (shouldCancel()) {
    cleanup(stage, overlay, board)
    return
  }

  overlay.classList.add('draw-overlay--visible')

  const { width, height } = viewport()
  const targetWidth = Math.min(width * 0.68, 270)
  const targetHeight = (targetWidth * 4) / 3
  const targetLeft = (width - targetWidth) / 2
  const targetTop = (height - targetHeight) / 2

  // The move/scale and the 3D flip start at the same instant and run together,
  // so the card reads as one continuous motion rather than "zoom then flip".
  await Promise.all([
    animate(
      stage,
      [
        {
          left: `${originalRect.left}px`,
          top: `${originalRect.top}px`,
          width: `${originalRect.width}px`,
          height: `${originalRect.height}px`,
          transform: 'rotate(0deg) scale(1)',
        },
        {
          left: `${targetLeft - 5}px`,
          top: `${targetTop + 5}px`,
          width: `${targetWidth + 10}px`,
          height: `${targetHeight + 10}px`,
          transform: 'rotate(-2deg) scale(1.025)',
          offset: 0.7,
        },
        {
          left: `${targetLeft}px`,
          top: `${targetTop}px`,
          width: `${targetWidth}px`,
          height: `${targetHeight}px`,
          transform: 'rotate(0deg) scale(1)',
        },
      ],
      { duration: DRAW_TIMINGS.move, easing: EASE_MOVE, fill: 'forwards' },
    ),
    animate(
      inner,
      [
        { transform: 'rotateY(0deg)' },
        { transform: 'rotateY(90deg)', offset: 0.44 },
        { transform: 'rotateY(180deg)' },
      ],
      { duration: DRAW_TIMINGS.flip, easing: EASE_FLIP, fill: 'forwards' },
    ),
  ])
  if (shouldCancel()) {
    cleanup(stage, overlay, board)
    return
  }

  await wait(DRAW_TIMINGS.hold)
  if (shouldCancel()) {
    cleanup(stage, overlay, board)
    return
  }

  await Promise.all([
    animate(
      stage,
      [
        {
          left: `${targetLeft}px`,
          top: `${targetTop}px`,
          width: `${targetWidth}px`,
          height: `${targetHeight}px`,
          transform: 'rotate(0deg) scale(1)',
        },
        {
          left: `${originalRect.left}px`,
          top: `${originalRect.top}px`,
          width: `${originalRect.width}px`,
          height: `${originalRect.height}px`,
          transform: 'rotate(0deg) scale(1)',
        },
      ],
      { duration: DRAW_TIMINGS.return, easing: EASE_RETURN, fill: 'forwards' },
    ),
    animate(overlay, [{ opacity: 1 }, { opacity: 0 }], {
      duration: DRAW_TIMINGS.fade,
      easing: 'ease',
      fill: 'forwards',
    }),
  ])
  if (shouldCancel()) {
    cleanup(stage, overlay, board)
    return
  }

  // The original slot now keeps a face-up, completed card before the mode opens.
  revealCard(card, modeLabel)
  cleanup(stage, overlay, board)
  await nextFrame()
  if (!shouldCancel()) onComplete()
}
