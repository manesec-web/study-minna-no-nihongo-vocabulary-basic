// Setup-time eligibility: derive each mode's availability from the user's
// actually-selected lessons, never from a fabricated word pool. The original
// nine modes are eligible whenever the pool is non-empty; the ten newer modes
// run their own `eligible` generator.
import { CONCRETE_MODES } from './modes.js'
import { wordFace } from './faces.js'
import { NEW_GAMES } from './games/index.js'

const LEGACY_MODES = new Set([
  'choice',
  'pairs',
  'match3',
  'connect',
  'boss',
  'memory',
  'spell',
  'reaction',
  'columns',
])

export function evaluateEligibility(library, lessons) {
  const refs = []
  for (const lesson of lessons) {
    const vols = library?.getVols ? library.getVols(lesson) : []
    for (let index = 0; index < vols.length; index += 1) refs.push({ lesson, index })
  }
  const faces = refs.map((ref) => wordFace(ref, library?.entry ? library.entry(ref) : null))
  const result = {}
  for (const mode of CONCRETE_MODES) {
    if (LEGACY_MODES.has(mode)) {
      result[mode] = { ok: faces.length > 0, reason: faces.length ? null : '沒有選取單詞' }
      continue
    }
    const game = NEW_GAMES[mode]
    result[mode] = game?.eligible ? game.eligible(faces) : { ok: false, reason: '未實作資格檢查' }
  }
  return result
}
