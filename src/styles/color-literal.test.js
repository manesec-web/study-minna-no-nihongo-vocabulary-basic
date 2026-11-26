import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const ALLOWED = path.resolve(ROOT, 'styles', 'app.css')

const HEX = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g
const FUNC = /\b(?:rgb|rgba|hsl|hsla)\s*\(/gi

function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (/\.(vue|js|css)$/.test(entry.name)) out.push(full)
  }
  return out
}

describe('colour literals stay in app.css', () => {
  it('no .vue/.js/.css file outside app.css writes a colour literal', () => {
    const offenders = []
    for (const file of walk(ROOT)) {
      if (file === ALLOWED) continue
      const text = fs.readFileSync(file, 'utf8')
      const lines = text.split('\n')
      lines.forEach((line, index) => {
        HEX.lastIndex = 0
        FUNC.lastIndex = 0
        let match
        while ((match = HEX.exec(line)) !== null) {
          offenders.push(`${path.relative(ROOT, file)}:${index + 1} ${match[0]}`)
        }
        while ((match = FUNC.exec(line)) !== null) {
          offenders.push(`${path.relative(ROOT, file)}:${index + 1} ${match[0]}`)
        }
      })
    }
    expect(offenders).toEqual([])
  })
})
