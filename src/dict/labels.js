// Maps the English speech/tag ids in the word files to the Chinese labels the
// UI prints (docs/data-contract.md → On-screen labels).

export const SPEECH_LABELS = {
  noun: '名詞',
  verb: '動詞',
  verb_group_1: '1類動詞',
  verb_group_2: '2類動詞',
  verb_group_3: '3類動詞',
  i_adjective: 'い形容詞',
  na_adjective: 'な形容詞',
  adverb: '副詞',
  demonstrative: '指示詞',
  determiner: '連體詞',
  conjunction: '接續詞',
  interjection: '感嘆詞',
  set_phrase: '固定套句',
  bound_morpheme: '附著語素',
}

export const TAG_LABELS = {
  people_role_address: '人與稱呼',
  object_tool: '物品',
  place_facility: '場所',
  time_date_quantity: '時間與數量',
  action_activity: '動作',
  quality_state_degree: '性質與程度',
  transportation_movement: '移動',
  food_housing_daily_life: '食衣住',
  communication_language_study: '語言與學習',
  greeting_conversational: '招呼與會話',
  grammar_pattern: '文法句型',
  reference_demonstrative: '指示詞',
  function_word: '功能語',
  culture_entertainment: '文化娛樂',
  nature: '自然',
  direction_position: '位置方向',
}

// When `verb_group_*` is present, draw that one pill and do not also draw 動詞.
export function speechLabels(speech) {
  if (!Array.isArray(speech)) return []
  const group = speech.find((id) => typeof id === 'string' && id.startsWith('verb_group_'))
  if (group && SPEECH_LABELS[group]) return [SPEECH_LABELS[group]]
  return speech.map((id) => SPEECH_LABELS[id]).filter(Boolean)
}

export function tagLabels(tags) {
  if (!Array.isArray(tags)) return []
  return tags.map((id) => TAG_LABELS[id]).filter(Boolean)
}
