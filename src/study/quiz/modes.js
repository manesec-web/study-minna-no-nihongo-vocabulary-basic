// Quiz mode registry: ids, labels, and the setup options. This file is data
// plus the small "resolve the pool" rule; the round engine lives in engine.js.

export const CONCRETE_MODES = [
  'choice',
  'pairs',
  'match3',
  'connect',
  'boss',
  'memory',
  'spell',
  'reaction',
  'columns',
  'swipe',
  'oddone',
  'fillblank',
  'wordle',
  'crossword',
  'falling',
  'whack',
  'nokanji',
  'mahjong',
  'kanatrap',
  'sushi',
  'spottypo',
  'wordsearch',
  'snake',
  'hangman',
]

// 隨機模式 is a lobby mechanic, not a question type. It is a checkbox in the
// setup screen but never appears inside `session.quiz.run.modes` as a playable
// mode. The UI lists it first, then every concrete mode in the spec order.
export const SETUP_MODES = ['random', ...CONCRETE_MODES]

export const MODE_LABELS = {
  random: '隨機模式',
  choice: '選擇題',
  pairs: '翻卡配對',
  match3: '消除下落',
  connect: '路徑連接',
  boss: 'Boss 戰',
  memory: '記憶順序',
  spell: '拼字／打亂重組',
  reaction: '快速反應',
  columns: '雙欄對決',
  swipe: '極速是非',
  oddone: '找出內鬼',
  fillblank: '缺字填空',
  wordle: '猜假名',
  crossword: '迷你填字',
  falling: '隕石防禦',
  whack: '打地鼠',
  nokanji: '去漢字盲測',
  mahjong: '單字麻將',
  kanatrap: '濁音排雷',
  sushi: '迴轉壽司',
  spottypo: '找碴讀音',
  wordsearch: '尋字迷宮',
  snake: '單字貪食蛇',
  hangman: '五十音劊子手',
}

export const COUNT_OPTIONS = ['all', 100, 50, 30, 10]
export const LIVES_OPTIONS = ['infinite', 10, 5, 3, 1]
export const TIME_OPTIONS = ['infinite', 10, 5, 3]

export const COUNT_LABELS = { all: '全部', 100: '100', 50: '50', 30: '30', 10: '10' }
export const LIVES_LABELS = { infinite: '無限', 10: '10次', 5: '5次', 3: '3次', 1: '1次' }
export const TIME_LABELS = { infinite: '無限', 10: '10秒', 5: '5秒', 3: '3秒' }

export function isConcreteMode(mode) {
  return CONCRETE_MODES.includes(mode)
}

// The pool of concrete modes for the 3×3 random draw, or the ordered sequence
// when 隨機模式 is off. An empty selection means "every concrete mode".
// 隨機模式 always draws from every concrete mode, even if a leftover
// selection is still sitting on the setup.
export function resolveModePool(modes, random = false) {
  if (random) return [...CONCRETE_MODES]
  const concrete = (Array.isArray(modes) ? modes : []).filter(isConcreteMode)
  return concrete.length > 0 ? concrete : [...CONCRETE_MODES]
}

// The 3×3 draw grid has 9 face-down cards, each hiding one mode from the pool.
export const DRAW_CARDS = 9
