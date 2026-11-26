import { specs as bootSpecs } from './boot.js'
import { specs as navSpecs } from './nav.js'
import { specs as lessonSpecs } from './lessons.js'
import { specs as settingsSpecs } from './settings.js'
import { specs as studySpecs } from './study.js'
import { specs as themeSpecs } from './theme.js'
import { specs as wordSpecs } from './word.js'
import { specs as cardSpecs } from './card.js'
import { specs as glyphSpecs } from './glyph.js'
import { specs as quizSpecs } from './quiz.js'

export function allSpecs(deps = {}) {
  return [
    ...bootSpecs(deps),
    ...navSpecs(),
    ...lessonSpecs(deps),
    ...settingsSpecs(deps),
    ...studySpecs(deps),
    ...themeSpecs(deps),
    ...wordSpecs(),
    ...cardSpecs(),
    ...glyphSpecs(deps),
    ...quizSpecs(deps),
  ]
}
