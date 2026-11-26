// Stroke-order playback for the 字形對照 detail page. This is the behaviour
// side of the two glyph panels: it loads a character's KanjiVG vector via the
// vendored kaki-jun library and returns a small controller that replays it.
// No stroke data is bundled or invented — a missing glyph or a network failure
// returns null and the view shows that panel as unavailable.
import { createKanjivg } from '../vendor/kaki-jun/createKanjivg.js'
import { KVGAnimator } from '../vendor/kaki-jun/dist/KanjivgAnimate.js'
import { prefersReducedMotion } from '../ui/motion.js'

const ANIMATION_MS = 500

// Recolour the fetched drawing to the site palette. The KanjiVG files carry a
// fixed black stroke and grey numbers; the page reads colours from the theme
// tokens instead, so the drawing stays visible in the dark theme.
function recolour(svg) {
  svg.querySelectorAll('[style]').forEach((el) => {
    const style = el.getAttribute('style') || ''
    if (/stroke\s*:/.test(style)) {
      el.style.stroke = 'var(--ink)'
    } else if (/fill\s*:/.test(style)) {
      el.style.fill = 'var(--muted)'
    }
  })
}

// Reveal the whole drawing at once: the reduced-motion path skips the
// per-stroke reveal and just shows the completed glyph.
function revealAll(svg) {
  svg.querySelectorAll('path, text').forEach((el) => {
    el.style.display = 'block'
    el.style.transition = 'none'
    el.style.strokeDasharray = ''
    el.style.strokeDashoffset = ''
  })
}

// Mount one character's stroke SVG into `host`. Returns `{ play }` on success,
// or `null` when the character has no usable KanjiVG data.
export async function mountGlyphStroke(host, character) {
  if (!host || typeof character !== 'string') return null
  const glyph = [...character][0]
  if (!glyph) return null

  host.replaceChildren()
  let svg
  try {
    svg = await createKanjivg(glyph)
  } catch {
    return null
  }
  if (!svg || svg.tagName !== 'svg' || svg.querySelectorAll('path').length === 0) {
    host.replaceChildren()
    return null
  }
  recolour(svg)
  host.replaceChildren(svg)
  const animator = new KVGAnimator(ANIMATION_MS)
  return {
    play() {
      if (prefersReducedMotion()) {
        revealAll(svg)
        return
      }
      animator.play(svg)
    },
  }
}
