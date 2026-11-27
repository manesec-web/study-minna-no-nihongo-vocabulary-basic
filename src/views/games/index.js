// One component per game. QuizPlayView resolves the active mode to a component
// here and stays a thin host (shell, timers, draw, completion).
import GameChoice from './game-choice.vue'
import GamePairs from './game-pairs.vue'
import GameMatch3 from './game-match3.vue'
import GameConnect from './game-connect.vue'
import GameBoss from './game-boss.vue'
import GameMemory from './game-memory.vue'
import GameSpell from './game-spell.vue'
import GameReaction from './game-reaction.vue'
import GameColumns from './game-columns.vue'
import GameSwipe from './game-swipe.vue'
import GameOddone from './game-oddone.vue'
import GameFillblank from './game-fillblank.vue'
import GameWordle from './game-wordle.vue'
import GameCrossword from './game-crossword.vue'
import GameFalling from './game-falling.vue'
import GameWhack from './game-whack.vue'
import GameNokanji from './game-nokanji.vue'
import GameMahjong from './game-mahjong.vue'
import GameKanatrap from './game-kanatrap.vue'
import GameSushi from './game-sushi.vue'
import GameSpottypo from './game-spottypo.vue'
import GameWordsearch from './game-wordsearch.vue'
import GameSnake from './game-snake.vue'
import GameHangman from './game-hangman.vue'

export const GAME_COMPONENTS = {
  choice: GameChoice,
  pairs: GamePairs,
  match3: GameMatch3,
  connect: GameConnect,
  boss: GameBoss,
  memory: GameMemory,
  spell: GameSpell,
  reaction: GameReaction,
  columns: GameColumns,
  swipe: GameSwipe,
  oddone: GameOddone,
  fillblank: GameFillblank,
  wordle: GameWordle,
  crossword: GameCrossword,
  falling: GameFalling,
  whack: GameWhack,
  nokanji: GameNokanji,
  mahjong: GameMahjong,
  kanatrap: GameKanatrap,
  sushi: GameSushi,
  spottypo: GameSpottypo,
  wordsearch: GameWordsearch,
  snake: GameSnake,
  hangman: GameHangman,
}
