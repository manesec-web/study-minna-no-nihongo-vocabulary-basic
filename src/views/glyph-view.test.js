import { describe, expect, it } from 'vitest'
import fs from 'node:fs'

function readView(name) {
  return fs.readFileSync(new URL(name, import.meta.url), 'utf8')
}

describe('字形對照 detail page', () => {
  it('renders the exact 簡/繁/日 columns and a play button', () => {
    const source = readView('./GlyphView.vue')
    expect(source).toMatch(/<table\b/)
    for (const header of ['簡', '繁', '日']) {
      expect(source).toContain(`scope="col">${header}<`)
    }
    expect(source).toContain('glyph-play')
    expect(source).toContain('播放筆順')
    expect(source).toContain('nav.go')
  })

  it('leaves exactly 30px between the play button and the stroke cards', () => {
    const source = readView('./GlyphView.vue')
    const css = source.split(/<style[^>]*>/)[1] ?? ''
    expect(css).toMatch(/\.glyph-play\s*\{[^}]*margin-bottom:\s*0/)
    expect(css).toMatch(/\.glyph-strokes\s*\{[^}]*margin-top:\s*30px/)
    expect(css).not.toMatch(/\.glyph-play\s*\{[^}]*margin-bottom:\s*(?!0(?:px)?)\d/)
    expect(css).not.toMatch(/\.glyph-strokes\s*\{[^}]*margin-top:\s*16px/)
  })

  it('the reader comparison pairs are clickable buttons', () => {
    const source = readView('./ReaderView.vue')
    expect(source).toMatch(/class="kanji-pair"/)
    expect(source).toContain('glyph.open')
    expect(source).toContain('data-detail-index')
    expect(source).toContain(':aria-label')
  })

  it('typography pairs sit flush and wash gray on hover', () => {
    const source = readView('./ReaderView.vue')
    const css = source.split(/<style[^>]*>/)[1] ?? ''
    const item = source.match(/class="kanji-list-item"[\s\S]*?<\/li>/)?.[0] ?? ''
    expect(source).not.toMatch(/class="kanji-chevron"/)
    expect(css).not.toMatch(/\.kanji-chevron/)
    expect(item).toMatch(/<\/button>\s*<p v-if="detail\.note" class="kanji-pair-note">/)
    expect(item).not.toMatch(/<button[\s\S]*kanji-pair-note[\s\S]*<\/button>/)
    expect(css).toMatch(/\.kanji-pair\s*\{[^}]*background:\s*transparent/)
    expect(css).toMatch(/\.kanji-pair\s*\{[^}]*padding:\s*2px 8px/)
    expect(css).toMatch(/\.kanji-pair\s*\{[^}]*border-radius:\s*8px/)
    expect(css).not.toMatch(/\.kanji-pair\s*\{[^}]*border-radius:\s*20px/)
    expect(css).toMatch(/\.kanji-pair\s*\{[^}]*width:\s*fit-content/)
    expect(css).toMatch(/\.kanji-pair\s*\{[^}]*transition:\s*transform 140ms ease, background 140ms ease/)
    expect(css).toMatch(/\.kanji-pair:active\s*\{[^}]*transform:\s*scale\(0\.97\)/)
    expect(css).not.toMatch(/\.kanji-pair\s*\{[^}]*(?<![\w-])width:\s*100%/)
    expect(css).not.toMatch(/\.kanji-pair\s*\{[^}]*padding:\s*12px 40px/)
    expect(css).not.toMatch(/\.kanji-pair\s*\{[^}]*padding:\s*0[;\s]/)
    expect(css).toMatch(/\.kanji-pair:hover\s*\{[^}]*background:\s*var\(--tint\)/)
    expect(css).toMatch(/\.kanji-pair:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--accent\)/)
    expect(css).not.toMatch(/\.kanji-pair[^{]*\{[^}]*var\(--surface\)/)
    expect(css).not.toMatch(/\.kanji-pair[^{]*\{[^}]*--shadow-float/)
    expect(css).not.toMatch(/\.kanji-pair:hover\s*\{[^}]*box-shadow/)
    expect(css).not.toMatch(/\.kanji-pair:focus-visible\s*\{[^}]*box-shadow/)
  })
})
