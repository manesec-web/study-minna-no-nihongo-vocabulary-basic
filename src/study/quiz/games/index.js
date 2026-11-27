// Registry of the newer game modes. Each module exports create/act/eligible
// and optional usesPool/usesRng flags; engine.js merges these into its dispatch
// tables without growing a giant switch.
import * as swipe from './game-swipe.js'
import * as oddone from './game-oddone.js'
import * as fillblank from './game-fillblank.js'
import * as wordle from './game-wordle.js'
import * as crossword from './game-crossword.js'
import * as falling from './game-falling.js'
import * as whack from './game-whack.js'
import * as nokanji from './game-nokanji.js'
import * as mahjong from './game-mahjong.js'
import * as kanatrap from './game-kanatrap.js'
import * as sushi from './game-sushi.js'
import * as spottypo from './game-spottypo.js'
import * as wordsearch from './game-wordsearch.js'
import * as snake from './game-snake.js'
import * as hangman from './game-hangman.js'

export const NEW_GAMES = {
  swipe,
  oddone,
  fillblank,
  wordle,
  crossword,
  falling,
  whack,
  nokanji,
  mahjong,
  kanatrap,
  sushi,
  spottypo,
  wordsearch,
  snake,
  hangman,
}
