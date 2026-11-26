import { describe, expect, it } from 'vitest'
import { speechLabels, tagLabels } from './labels.js'

describe('speechLabels', () => {
  it('maps a noun', () => {
    expect(speechLabels(['noun'])).toEqual(['名詞'])
  })

  it('draws only the verb group, not 動詞', () => {
    expect(speechLabels(['verb', 'verb_group_1'])).toEqual(['1類動詞'])
    expect(speechLabels(['verb', 'verb_group_2'])).toEqual(['2類動詞'])
    expect(speechLabels(['verb', 'verb_group_3'])).toEqual(['3類動詞'])
  })

  it('maps two non-verb speeches', () => {
    expect(speechLabels(['adverb', 'demonstrative'])).toEqual(['副詞', '指示詞'])
  })
})

describe('tagLabels', () => {
  it('maps tags in file order', () => {
    expect(tagLabels(['people_role_address', 'nature'])).toEqual(['人與稱呼', '自然'])
  })

  it('drops unknown ids', () => {
    expect(tagLabels(['object_tool', 'nope'])).toEqual(['物品'])
  })
})
