import { describe, expect, it } from 'vitest'
import { createZip } from '../../scripts/zip.mjs'
import { openArchive } from './archive.js'

const encoder = new TextEncoder()

describe('openArchive', () => {
  it('round-trips an in-memory ZIP written by scripts/zip.mjs', async () => {
    const bytes = createZip([
      { name: 'lesson_1.json', bytes: encoder.encode('{"lesson_1":{"vols":[]}}') },
      { name: 'lesson_2.json', bytes: encoder.encode('{"lesson_2":{"vols":[]}}') },
    ])
    const archive = await openArchive(bytes)
    expect(archive.names.sort()).toEqual(['lesson_1.json', 'lesson_2.json'])
    expect(archive.has('lesson_1.json')).toBe(true)
    expect(archive.has('schema.json')).toBe(false)
    expect(new TextDecoder().decode(await archive.read('lesson_2.json'))).toBe(
      '{"lesson_2":{"vols":[]}}',
    )
  })

  it('throws for a missing entry', async () => {
    const bytes = createZip([{ name: 'lesson_1.json', bytes: encoder.encode('x') }])
    const archive = await openArchive(bytes)
    await expect(archive.read('lesson_9.json')).rejects.toThrow(/archive entry missing/)
  })
})
