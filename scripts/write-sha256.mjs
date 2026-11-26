#!/usr/bin/env node
// Hashes the raw bytes of vol/lesson_1.json .. vol/lesson_50.json and writes
// src/data/vol-manifest.json. With --check it verifies the manifest and the
// lesson files instead of writing, and exits non-zero on any mismatch or a
// lesson that breaks the data contract.
//
// Manifest record: { name: 'lesson_1.json', id: 'lesson_1', sha256: '<hex>' },
// inside { files: [ ... ] } in lesson order.
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const volDir = path.join(rootDir, 'vol')
const manifestPath = path.join(rootDir, 'src', 'data', 'vol-manifest.json')
const LESSON_COUNT = 50

const SPEECH_IDS = [
  'noun',
  'verb',
  'verb_group_1',
  'verb_group_2',
  'verb_group_3',
  'i_adjective',
  'na_adjective',
  'adverb',
  'demonstrative',
  'determiner',
  'conjunction',
  'interjection',
  'set_phrase',
  'bound_morpheme',
]

const TAG_IDS = [
  'people_role_address',
  'object_tool',
  'place_facility',
  'time_date_quantity',
  'action_activity',
  'quality_state_degree',
  'transportation_movement',
  'food_housing_daily_life',
  'communication_language_study',
  'greeting_conversational',
  'grammar_pattern',
  'reference_demonstrative',
  'function_word',
  'culture_entertainment',
  'nature',
  'direction_position',
]

function sha256Hex(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value !== ''
}

function isStringOrNull(value) {
  return value === null || typeof value === 'string'
}

function fail(message) {
  throw new Error(message)
}

function validateSpeech(speech) {
  if (!Array.isArray(speech) || speech.length < 1 || speech.length > 2) {
    return fail('speech must be one or two strings')
  }
  if (!speech.every((id) => SPEECH_IDS.includes(id))) {
    return fail(`speech has an unknown id: ${JSON.stringify(speech)}`)
  }
  const hasVerb = speech.includes('verb')
  const hasGroup = speech.some((id) => id.startsWith('verb_group_'))
  if (hasVerb) {
    const valid =
      speech.length === 2 &&
      speech[0] === 'verb' &&
      ['verb_group_1', 'verb_group_2', 'verb_group_3'].includes(speech[1])
    if (!valid) return fail(`verb speech must be ["verb", "verb_group_N"]: ${JSON.stringify(speech)}`)
  } else if (hasGroup) {
    return fail(`a non-verb must not carry verb_group_*: ${JSON.stringify(speech)}`)
  }
}

function validateTags(tags) {
  if (!Array.isArray(tags) || tags.length < 1 || tags.length > 2) {
    return fail('tags must be one or two strings')
  }
  if (!tags.every((id) => TAG_IDS.includes(id))) {
    return fail(`tags has an unknown id: ${JSON.stringify(tags)}`)
  }
}

function validateKanjiNote(note) {
  if (note === null) return
  if (typeof note !== 'object' || Array.isArray(note)) {
    return fail('kanji_note must be null or an object')
  }
  if (!isNonEmptyString(note.summary)) {
    return fail('kanji_note.summary must be a non-empty string')
  }
  if (!Array.isArray(note.details) || note.details.length === 0) {
    return fail('kanji_note.details must be a non-empty array')
  }
  for (const detail of note.details) {
    if (typeof detail !== 'object' || detail === null || Array.isArray(detail)) {
      return fail('kanji_note.details items must be objects')
    }
    if (!isNonEmptyString(detail.jp)) return fail('kanji_note.details[].jp must be a non-empty string')
    if (!isStringOrNull(detail.zh)) return fail('kanji_note.details[].zh must be a string or null')
    if (!isStringOrNull(detail.note)) return fail('kanji_note.details[].note must be a string or null')
  }
}

function validateEntry(entry) {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return fail('vols entries must be objects')
  }
  const required = ['japanese', 'kanji', 'chinese', 'image', 'note', 'kanji_note', 'tags', 'speech', 'sentence']
  for (const key of required) {
    if (!(key in entry)) return fail(`missing required field: ${key}`)
  }
  if (!isNonEmptyString(entry.japanese)) return fail('japanese must be a non-empty string')
  if (!(typeof entry.kanji === 'string' || entry.kanji === null)) {
    return fail('kanji must be a string or null')
  }
  if (!isNonEmptyString(entry.chinese)) return fail('chinese must be a non-empty string')
  if (entry.image !== null) return fail('image must be null')
  if (!isStringOrNull(entry.note)) return fail('note must be a string or null')
  validateKanjiNote(entry.kanji_note)
  validateTags(entry.tags)
  validateSpeech(entry.speech)
  if (!Array.isArray(entry.sentence) || entry.sentence.length !== 20) {
    return fail(`sentence must be exactly 20 items (got ${Array.isArray(entry.sentence) ? entry.sentence.length : 'n/a'})`)
  }
  for (const sentence of entry.sentence) {
    if (typeof sentence !== 'object' || sentence === null || Array.isArray(sentence)) {
      return fail('sentence items must be objects')
    }
    if (!isNonEmptyString(sentence.japanese)) return fail('sentence[].japanese must be a non-empty string')
    if (!isNonEmptyString(sentence.chinese)) return fail('sentence[].chinese must be a non-empty string')
  }
}

function validateLessonFile(name, bytes) {
  let doc
  try {
    doc = JSON.parse(bytes.toString('utf8'))
  } catch (error) {
    return fail(`${name} is not valid JSON: ${error.message}`)
  }
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) {
    return fail(`${name} must be a JSON object`)
  }
  const id = name.replace(/\.json$/, '')
  if (!(id in doc)) {
    return fail(`${name}: root key must be ${id}`)
  }
  const lesson = doc[id]
  if (typeof lesson !== 'object' || lesson === null || Array.isArray(lesson)) {
    return fail(`${name}: ${id} must be an object`)
  }
  if (!Array.isArray(lesson.vols)) {
    return fail(`${name}: ${id}.vols must be an array`)
  }
  for (const entry of lesson.vols) validateEntry(entry)
}

function buildManifest() {
  const files = []
  for (let lesson = 1; lesson <= LESSON_COUNT; lesson += 1) {
    const name = `lesson_${lesson}.json`
    const fullPath = path.join(volDir, name)
    if (!fs.existsSync(fullPath)) {
      fail(`missing dictionary file: ${fullPath}`)
    }
    const bytes = fs.readFileSync(fullPath)
    try {
      validateLessonFile(name, bytes)
    } catch (error) {
      fail(`${name}: ${error.message}`)
    }
    files.push({ name, id: `lesson_${lesson}`, sha256: sha256Hex(bytes) })
  }
  return { files }
}

function readManifest() {
  if (!fs.existsSync(manifestPath)) return null
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  } catch (error) {
    return { parseError: error.message }
  }
}

function check() {
  const expected = buildManifest()
  const actual = readManifest()
  if (!actual) {
    console.error(`manifest missing: ${path.relative(rootDir, manifestPath)}`)
    return 1
  }
  if (actual.parseError) {
    console.error(`manifest is not valid JSON: ${actual.parseError}`)
    return 1
  }
  if (!Array.isArray(actual.files)) {
    console.error('manifest shape is not recognized')
    return 1
  }
  if (actual.files.length !== expected.files.length) {
    console.error(
      `manifest has ${actual.files.length} lessons, expected ${expected.files.length}`,
    )
    return 1
  }
  let failures = 0
  for (const want of expected.files) {
    const got = actual.files.find((entry) => entry.id === want.id)
    if (!got) {
      console.error(`${want.id}: entry missing from manifest`)
      failures += 1
      continue
    }
    if (got.name !== want.name || got.sha256 !== want.sha256) {
      console.error(
        `${want.id}: manifest hash ${got.sha256} does not match file hash ${want.sha256}`,
      )
      failures += 1
    }
  }
  if (failures > 0) {
    console.error(`${failures} lesson(s) failed the manifest check`)
    return 1
  }
  console.log(`manifest ok: ${expected.files.length} lessons`)
  return 0
}

function write() {
  const manifest = buildManifest()
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`wrote ${path.relative(rootDir, manifestPath)} (${manifest.files.length} lessons)`)
  return 0
}

try {
  const wantsCheck = process.argv.includes('--check')
  process.exitCode = wantsCheck ? check() : write()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
