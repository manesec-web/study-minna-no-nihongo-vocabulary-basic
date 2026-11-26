import { describe, expect, it } from 'vitest'
import fs from 'node:fs'

function readView(name) {
  return fs.readFileSync(new URL(name, import.meta.url), 'utf8')
}

describe('practice flashcard page', () => {
  it('centers the Japanese, including each wrapped line', () => {
    const source = readView('./CardView.vue')
    const css = source.split(/<style[^>]*>/)[1] ?? ''
    expect(css).toMatch(/\.word\s*\{[^}]*text-align:\s*center/)
    expect(css).toMatch(/\.word\s+:deep\(\.ruby-word\)\s*\{[^}]*justify-content:\s*center/)
  })
})
