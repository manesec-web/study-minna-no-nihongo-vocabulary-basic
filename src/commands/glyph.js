// 字形對照 detail page commands. Opening a pair records which entry and which
// detail it came from, then switches to the glyph screen. `glyph.play` bumps a
// counter the view watches to replay both stroke-order animations.
import { CommandError } from '../engine/errors.js'
import { glyphRow } from '../dict/glyph.js'

export function specs(deps = {}) {
  const library = deps.library

  function currentDetail(session, detailIndex) {
    if (session.items.length === 0) return null
    const item = session.items[session.index]
    const vol = library && library.entry ? library.entry(item) : null
    const details = vol?.kanji_note && typeof vol.kanji_note === 'object' ? vol.kanji_note.details : null
    if (!Array.isArray(details)) return null
    if (!Number.isInteger(detailIndex) || detailIndex < 0 || detailIndex >= details.length) return null
    return { item, detail: details[detailIndex] }
  }

  return [
    {
      id: 'glyph.open',
      params: ['detailIndex'],
      enabled: (session) => session.screen === 'reader' && session.items.length > 0,
      run: (session, params) => {
        const found = currentDetail(session, params.detailIndex)
        if (!found) {
          throw new CommandError(
            'invalid-index',
            `No 字形對照 detail at index ${String(params.detailIndex)}`,
            { detailIndex: params.detailIndex },
          )
        }
        const row = glyphRow(found.detail)
        session.glyph = {
          lesson: found.item.lesson,
          index: found.item.index,
          detailIndex: params.detailIndex,
          zh: row.hasTraditional ? row.traditional : null,
          jp: row.japanese,
          note: typeof found.detail.note === 'string' ? found.detail.note : null,
          simplified: row.simplified,
          hasTraditional: row.hasTraditional,
        }
        session.glyphPlayCount = 0
        session.screen = 'glyph'
        return { glyph: session.glyph }
      },
    },
    {
      id: 'glyph.play',
      params: [],
      enabled: (session) => session.screen === 'glyph' && session.glyph !== null,
      run: (session) => {
        session.glyphPlayCount += 1
        return { playCount: session.glyphPlayCount }
      },
    },
  ]
}
