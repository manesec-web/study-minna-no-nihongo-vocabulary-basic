# Changelog

## 2026-11-27 — Boss 戰 marks, 極速是非 ⭕/❌, 找出內鬼 list, 6×6 kana pads

Four quiz UX changes from the user's list, on the uncommitted tree on top of
`f8383eb` (`vol/`, `index.html`, the favicon, and the Google Tag IDs are
untouched; nothing is committed by this work):

- **Boss 戰 / 選擇題 — icon-only marks that never move the label.** The picked
  choice used to append `✓ 正確` / `✗ 錯誤` inside a space-between flex row, so
  the label jumped sideways when the mark appeared. The mark is now the bare
  icon (`✓` / `✗`, `aria-hidden`) in an absolutely positioned slot at the
  right of the button and the label stays centred. 選擇題 shares the same
  `choice--with-mark` markup and CSS, so it gets the same treatment.
- **極速是非 — ⭕ / ❌, red on a wrong judgement, 0.5s / 3s.** The two judge
  buttons are icon-only (`❌` / `⭕`, accessible names 錯誤配對 / 正確配對; a
  caption above the card names them). `game-swipe.js` no longer opens a reveal
  on a wrong judgement: it records the pressed value (`state.chosen`) and sets
  `phase` to `correct` or `wrong`; the shell advances with `quiz.next` after
  ~0.5s (correct) or ~3s (wrong) — the same clock 選擇題 and Boss 戰 use. A
  wrong judgement turns the card red (border and text) and the pressed button
  red; a correct one outlines card and button with the highlight border. No
  `確定`, no `正確答案` line.
- **找出內鬼 — one group per row.** `.oddone-grid--list`: a single-column
  list with the Japanese on the left and the Chinese meaning on the right
  (was a 2×2 grid that was too small on a phone). 找碴讀音 keeps its 2×2 grid.
- **猜假名 / 五十音劊子手 — 6×6 pads.** `buildKanaPad` in
  `games/shared.js` builds 36 keys: the 36 kana most frequent in the shipped
  readings in gojuon order, with the answer's own kana always swapped into the
  tail, so a word is never unguessable. The pad lives on `round.state.pad`
  (built in `create` / `pickTarget`) and both views render it; the physical
  keyboard accepts the pad's kana. The old ~72-key `WORDLE_KANA` /
  `HANGMAN_KANA` strings are gone.
- **Found and fixed: an infinite loop in 迴轉壽司's `buildPad`.** The
  uncommitted 4×4 pad topped itself up with `pool[random]` and re-picked while
  the kana was already used — with a constant rng (`zeroRandom` in the engine
  tests) that never terminates, and it hung `npm test` with four vitest
  workers spinning. It now shuffles the pool once and takes the first keys.

Checks: `npm test` — 42 files, 329 tests; `npm run build` — `dict/vol.bin` 50
lessons; `node scripts/browser-check.mjs` — 218 checks pass, including new
ones for the icon-only / unmoving Boss 戰 marks (label x before = after), the
⭕/❌ buttons, the red wrong state, the measured ~3s / ~0.5s advance, the
one-column 找出內鬼 list, and the 6×6 pads in both themes. The stale
`.sushi-input` browser-check selector (the mode now has an on-screen pad, not
an `<input>`) was updated to `.sushi-pad .sushi-key`.

## 2026-11-27 — 單字麻將 tile faces: solid tiles, frost on covered ones

Visual-only fix on the uncommitted tree (`HEAD` stays `f1b55dd`; rules,
geometry, and the frame are untouched). A mid-play screenshot showed the free
(selectable) tiles sitting on a wash of semi-transparent blocked tiles with
overlapping glyphs bleeding through — `.mahjong-tile--blocked` dimmed the
whole tile with `opacity: 0.72`, so covered faces turned see-through and the
text mashed together. Covered tiles now keep a solid body, are dimmed by one
uniform frost veil (`::before`, over face and text), lose type contrast, cast
only a small layer shadow, and keep the darker 3D offset side — the 羊了個羊
peek-under stays, the mash is gone. Free tiles keep their solid face and pop
with a stronger lift shadow; tray tiles keep the same chrome. Four new
tokens in `src/styles/app.css` (both dark blocks) + `docs/theme.md`:
`--mahjong-veil`, `--mahjong-blocked-ink`, `--mahjong-side`, `--shadow-tile`;
`quiz-games.css` uses only `var(--…)`.

Checks: `npm test` — 42 files, 324 tests; `npm run build` — `dict/vol.bin` 50
lessons; `node scripts/browser-check.mjs` — all pass, including the ~520px
frame containment now extended to lock the visual rule (blocked tiles have
`opacity: 1` plus a frost veil, free tiles a solid opaque face); light + dark
mid-play screenshots reviewed under `/tmp/quiz-refs/shots/`. The snake
respawn check remains timing-flaky (1s respawn vs a 1.2s wait) and passes on
re-run — unchanged by this work.

## 2026-11-27 — 音拍猜謎 removed, 單字麻將 pile + tray framed

Two quiz changes, stacked on the uncommitted tree (`HEAD` stays `f1b55dd`;
`vol/`, `index.html`, the favicon, and the Google Tag IDs are untouched):

- **音拍猜謎 (mora) retired.** `game-mora.js` / `game-mora.vue` are deleted and
  the mode is dropped from `CONCRETE_MODES` / `SETUP_MODES` / `MODE_LABELS`,
  `NEW_GAMES`, `GAME_COMPONENTS`, setup eligibility, and the per-mode hints in
  `hint.js`. The quiz is 24 concrete modes plus 隨機模式. `quiz-view.test.js`
  has an end-to-end removal test (24 modes, no mora label or file, every
  remaining mode still builds a round with a hint rule), and
  `scripts/browser-check.mjs` asserts the setup lists 24 mode chips and omits
  音拍猜謎. Old changelog/progress sections that mention the mode when it was
  added are historical and stay as written.
- **單字麻將 — one visible frame around the pile and the tray.** A screenshot
  showed the pile floating outside a marked area and the seven tray slots in a
  loose band below it. The pile box and the 托盤 n / 7 caption plus the
  seven-slot tray now sit inside one `.mahjong-frame` (2px `--thumb` border,
  tinted background, card shadow, `overflow: hidden`, padding that keeps the
  3D tile sides and covered-tile peek inside). The pile height is a
  `padding-top` percentage (`boardRatio` from `game-mahjong.js`), not
  `aspect-ratio`, so the frame is sized on short windows with a dvh clamp and
  never spills off-screen; tile text clips instead of pushing tiles wide.
  `browser-check` now also plays mahjong at a narrow (~520px) width with tiles
  both on the pile and in the tray and asserts every tile, slot, and text
  rectangle stays inside `.mahjong-frame`.

Checks: `npm test` — 42 files, 324 tests; `npm run build` — `dict/vol.bin` 50
lessons; `node scripts/browser-check.mjs` — 203 checks pass (24-mode setup,
mahjong frame containment at ~520px, mahjong full play-through retained).

## 2026-11-27 — 去漢字盲測 blank-board fix, 羊了個羊-scale 單字麻將, 濁音排雷 10 per round, 單字貪食蛇 fine grid

Four quiz changes, stacked on the uncommitted tree (`HEAD` stays `f1b55dd`;
`vol/`, `index.html`, the favicon, and the Google Tag IDs are untouched):

- **去漢字盲測 (nokanji) — blank board from the second question on.**
  `game-nokanji.js`'s `buildQuestion` assigned `round.state.question` as a side
  effect and returned `undefined`, yet it was passed to `advanceQuestion`,
  which stores the callback's return value. So the first question rendered and
  every later one stored `undefined`; the view then threw
  `Cannot read properties of undefined (reading 'promptFace')` and Vue
  rendered an empty comment — the shell's accent mode label with a blank play
  area. The helper now returns the question. New tests play the mode through
  several questions (correct → `next`, wrong → `confirm`), and
  `quiz-view.test.js` server-renders every question mode's component on its
  **second** question so this class of bug cannot pass again.
- **單字麻將 (mahjong) — bigger, denser, 羊了個羊-style, provably solvable.**
  The old board was one row of six 48×68 columns (18 tiles). The new pile is a
  three-layer pyramid whose odd layers sit over the 2×2 junctions of the layer
  below, with taller corner piles on a fourth layer: 24 tiles (3–4 words), 30
  (5–6), 54 (7+), each word in whole 漢字/假名/中文 triples.
  Geometry is in board units and rendered by percentage with `cqw` type, so
  tiles scale with the play area (≈56×73 px on a phone, ≈68×88 px on desktop);
  every tile keeps its darker offset side and higher layers ride higher so
  covered tiles peek out; corner piles settle up as they empty. Rules are
  unchanged (overlap + left/right sandwich blocking, 7-slot tray, triple
  before limit). Solvability is by construction: `solutionOrder` sweeps layers
  top-down, rows left→right, and the triples are dealt A B C A B C A B C along
  that sweep, so the tray peaks at six plus the completing seventh; a unit
  test plays that order on nine generated boards with zero lives lost, and
  `browser-check` plays a full 54-tile board to 清空 in Chrome.
- **濁音排雷 (kanatrap) — 10 questions per round (was 1).** `create` now builds
  `QUESTIONS_PER_ROUND = 10` questions; a correct answer holds ~1s then
  `quiz.next`, a wrong one/timeout reveals and `確定` moves on, and the round
  clears once all 10 are answered. With fewer than 10 eligible words the pool is
  reshuffled and reused; with more, 10 distinct words are drawn. The hint key is
  `kanatrap:<index>` so the 10s clock restarts per question (tested), and the
  view shows `第 n / 10 題`. 音拍猜謎 is unchanged.
- **單字貪食蛇 (snake) — fine mostly-empty grid with a guaranteed route.**
  A 13×17 grid (221 small cells) replaces the full 8×8. The word's kana sit 2–3
  cells apart along a reserved self-avoiding walk from the start (rows only
  ever go down, so it never revisits a cell), and 22–28 wrong kana — never a
  kana of the current word — are scattered off the walk. Correct kana stay
  gone and grow the snake; a wrong kana is eaten, shrinks the snake by one, and
  returns after 1s in a random empty cell (`state.respawn` queue + the view's
  `respawn-timer.js` dispatching `quiz.act {type:'respawn'}` late; no rule in
  the `.vue`); wall/self collision costs a life and resets only the snake. A
  unit test drives the snake along `state.route` on three seeds and finishes
  the word with zero penalties.

Checks: `npm test` — 42 files, 325 tests; `npm run build` — `dict/vol.bin` 50
lessons; `node scripts/browser-check.mjs` — all pass, including the new
nokanji second/third-question renders, mahjong size/density/tray/full
play-through, kanatrap 10-answer round + per-question hint restart, snake
grid metrics + direction key, and the 提示 button in all four modes.

## 2026-11-27 — 10s 提示 button across all 25 quiz modes

Every remaining concrete quiz mode gains a one-shot `提示` hint. The button
sits at the top right of the `quiz-play` bar and appears after 10 seconds of
continuous actionable time (not wall-clock; the clock pauses through held
reveals and intros and resets on a new question/board/target/group). The rule
lives in `src/study/quiz/hint.js`: `hintRule` names the reset key + whether the
player can act now, and `applyHint` stores one per-mode `round.hintEffect`.
`src/commands/quiz.js` recomputes `round.hint` after every action and exposes
`quiz.hintReady` / `quiz.hint`; `QuizPlayView.vue` only runs the 200ms
accumulating timer and renders the button. Each `game-*.vue` reads
`round.hintEffect` for its highlight/reading/letter (choice highlight, pair/
connect/column/match3 highlights, odd-card highlight, falling cannon, whack
hole, mahjong free tile, spell tile, wordle/hangman kana, sushi reading,
wordsearch line, snake food, crossword cell, swipe judgement outline).
`game-whack.js` adds a per-target `turn` so the hint resets with each mole
board. Colours stay var() tokens only. `vol/`, `GTM_ID` / `GA4_ID`, and the
favicon files are unchanged.

## 2026-11-27 — remove 三元消消樂/振假名狙擊, rework 打地鼠 timing, 羊了個羊-style 單字麻將

Three changes on top of the previous quiz-mode redesign (no canvas engine; Vue +
CSS + delayed dispatch):

- `trimatch` (三元消消樂) and `furigana` (振假名狙擊) are removed end to end:
  dropped from `CONCRETE_MODES` / `MODE_LABELS` / `SETUP_MODES`, `NEW_GAMES`,
  `GAME_COMPONENTS`, eligibility, and every test/browser-check; their
  `game-*.js` / `game-*.vue` files are deleted. The quiz now has 25 concrete
  modes.
- `whack` (打地鼠) now shows exactly one mole at a time on a rule-significant
  1s-up / 2s-down cycle: a tick hides the mole, then two down ticks bring the
  next mole up. Each appearance uses a different hole than the previous one and
  a different word/face (the nine holes are never all one text). The cycle is
  driven by the existing 1s visibility interval, so reduced motion only
  shortens the pop animation and never the timing.
- `mahjong` (單字麻將) is re-rendered as a real 羊了個羊-style stacked board:
  tiles are absolutely positioned with per-layer offsets and a visible 3D side
  (`::after` offset in `--surface-strong`), so a covered tile peeks out under
  the one on top; a tile moved to the tray or cleared leaves its stack and the
  tiles below settle up. Rules (free/blocked, 7-slot tray, triple-before-limit)
  are unchanged.

`vol/`, the Google Tag IDs, and the colour tokens are unchanged. Checks:
`node scripts/write-sha256.mjs --check` passes; `npm test` — 40 files, 301 tests;
`npm run build` — `dict/vol.bin` has 50 lessons; `node scripts/browser-check.mjs`
— all checks pass (25-mode setup, whack one-mole cycle, mahjong stacked board).

## 2026-11-27 — four quiz modes redesigned: pairs 3s peek + 4×5, match3 random solvability, connect 8×5, memory pile-to-slots

A redesign of the same four quiz modes, replacing the previous layout, timing,
and memory flow (no canvas engine; Vue + CSS + delayed dispatch through
`store.send`):

- 翻卡配對 is now a fixed 4-column × 5-row grid (20 cards / 10 pairs). A 3s
  peek bar sits above the board and counts down; taps and the quiz clock are
  held during the peek, and play + the countdown start on `quiz.resolve` when
  the bar finishes and the cards flip back face-down. Reduced motion keeps the
  3s peek and only shortens the flip.
- 消除下落 no longer stamps the guaranteed clear at the top-left three cells.
  `ensureMatch3Move` now reshuffles the freshly dealt cells (survivors stay
  after gravity) up to a bounded number of tries for a natural group, and only
  as a last resort plants a 3-cell group at a random position with a random
  legal shape (horizontal / vertical / small L). The 10-group win and the
  drop-in/gravity/pop motion are unchanged.
- 路徑連接 changes from 6×9 (54 cells) to 8 rows × 5 columns (40 cells,
  20 pairs): `CONNECT_COLS` 5 / `CONNECT_ROWS` 8, `repeat(5, minmax(0, 1fr))`,
  and the measured path SVG works unchanged.
- 記憶順序 is rebuilt: a single bottom pile of three cards, one tap, then
  cards dealt into three slots one by one; a 2s countdown holds the words
  readable; the words leave the slots and six 中文 options are placed into
  slots 1/2/3; the third placement grades all three together and flips the
  slots to show right/wrong. Wrong loses one life and retries the same group;
  the clock is held until the options are interactable. No 記住了 button.

`vol/`, the Google Tag IDs, and the colour tokens are unchanged. Checks:
`node scripts/write-sha256.mjs --check` passes; `npm test` — 40 files, 301 tests;
`npm run build` — `dict/vol.bin` has 50 lessons; `node scripts/browser-check.mjs`
— all checks pass (pairs 4×5 + 3s peek bar, match3 solvable group, connect
8×5 fit/path, memory pile → deal → countdown → place → check).

## 2026-11-27 — four quiz modes: pairs deal peek, match3 10-group win, connect 9 rows, memory poker-table intro

A rule + animation pass over four quiz modes, all through Vue + CSS + the
`quiz.resolve` delayed-dispatch pattern (no canvas engine):

- 翻卡配對 now opens with a staggered all-face-up deal — cards flip open in a
  wave, hold a ~2s peek (kept under reduced motion), then flip back face-down in
  a reverse wave before play. Views/CSS: `game-pairs.vue`, `pair-deal-up` /
  `pair-deal-down` keyframes in `quiz-games.css`.
- 消除下落 now ends after **10 cleared groups**, not 10 tiles
  (`round.state.clearCount`). The opening drop-in and post-clear gravity are
  animated (column-staggered fall with overshoot settle, a scale pop on cleared
  tiles before gravity, and new tiles fall from above); the countdown is held
  during the opening drop-in, and the `結束本模式` button plus `quiz.end` are
  removed. `hasMatch3Move` / `ensureMatch3Move` still guarantee a clearable 3+
  group on the deal and every refill.
- 路徑連接 grows from 6×6 to 6×9 (54 cells, 27 pairs); columns stay
  `repeat(6, minmax(0, 1fr))` and the measured path SVG / solve-keeping shuffle
  work on the taller board.
- 記憶順序 replaces the static "show 3 cards + 記住了" intro with a 12-card
  face-down poker table: the three target words flip open in sequence, hold long
  enough to read, then vanish, and the Chinese question starts automatically (no
  button, still untimed, wrong-answer rules unchanged).

`vol/`, the Google Tag IDs, and the colour tokens are unchanged. Checks:
`node scripts/write-sha256.mjs --check` passes; `npm test` — 40 files, 296 tests;
`npm run build` — `dict/vol.bin` has 50 lessons; `node scripts/browser-check.mjs`
— all checks pass (pairs deal peek, match3 groups, connect 6×9 fit/path, memory
poker-table auto-advance).

## 2026-11-27 — eight more quiz modes (27 total)

Eight independent `game-*` modes join the registry: 單字麻將, 濁音排雷, 迴轉壽司, 找碴讀音, 音拍猜謎, 尋字迷宮, 單字貪食蛇, 五十音劊子手. Each has its own state machine (`src/study/quiz/games/game-*.js`) and component (`src/views/games/Game*.vue`), setup eligibility with a precise disable reason, and unit/integration tests. `scripts/browser-check.mjs` renders and operates all 27 modes. `vol/` and the Google Tag IDs are unchanged.

## 2026-11-27 — ten new quiz modes and one-game-per-component architecture

The quiz grows from 9 to 19 concrete modes (plus 隨機模式). The ten new modes — 極速是非, 找出內鬼, 缺字填空, 猜假名, 迷你填字, 三元消消樂, 隕石防禦, 打地鼠, 去漢字盲測, 振假名狙擊 — each live in their own `src/study/quiz/games/game-*.js` state machine (create/act/eligible) and `src/views/games/Game*.vue` component; `src/views/QuizPlayView.vue` is now a thin host that resolves the active mode to a component. Mode eligibility is derived from the selected lessons at setup time (`src/study/quiz/eligibility.js`) and disables ineligible chips with a reason; `beginNext` safely skips ineligible modes without looping. A generic `quiz.act` command carries the newer games' non-tap inputs (swipe judge, wordle/crossword input, falling/whack ticks, trimatch toggle).

Each new mode has unit/integration tests for win/fail/input paths and eligibility, and `scripts/browser-check.mjs` renders + operates every new board. `vol/` and the Google Tag IDs are unchanged.

## 2026-11-27 — pairs 4-column mobile grid and reaction prompt colon removed

- 翻卡配對 keeps its face-down `?` / 3D flip, and now lays out 4 columns × 5 rows at `max-width: 550px` (mobile) while keeping 5 columns × 4 rows on desktop.
- 快速反應's big prompt drops the stray leading `:`/`：`; the small language label stays and the word text is rendered verbatim (punctuation and brackets inside the word are not touched).

Both are covered by view-source unit tests and browser-level assertions (grid column count at 390px and 1024px, and prompt prefix / language split / no-stale-flash checks). `vol/` and the Google Tag IDs are unchanged.

## 2026-11-27 — quiz mode regressions fixed (pairs face, match3 solvability, connect surfaces/overflow, boss HP, reaction languages)

Browser-level regression pass over the five quiz modes:

- 翻卡配對 now starts face-down (`?` on the visible face, the text face rotated away with `backface-visibility: hidden`), and the quiz no longer renders any `正確`/`錯誤` feedback text; the `正確答案：…` reveal remains where a reveal is needed.
- 消除下落 guarantees and proves a real connected 3+ group by canonical word id (漢字/假名/中文 aliases share the id). An illegal extension — non-adjacent same word, or neighbouring different word — costs a life; a different group's start only re-selects. Tests use the real 第16課 aliases (顔/かお/臉) and a clickable BFS-ordered path, across multiple seeds and after gravity refills.
- 路徑連接 restores the visible surface/border on uncleared cells (only cleared cells turn transparent) and fits the 6×6 board with `repeat(6, minmax(0, 1fr))` + `min-width: 0`, with length-based font classes for long words. The winning path is now a measured SVG polyline that keeps hugging cell centres after resize.
- Boss 戰 HP is monotonic: correct answers only decrease it, wrong answers never raise it.
- 快速反應 prompt and options now always use different faces, option texts are unique (one correct card), a wrong tap keeps the same board with a red frame, and a correct hit clears the frame and any stale text before the next question.

`vol/`, the Google Tag IDs, and the other screens are unchanged.

## 2026-11-27 — quiz modes tightened: pairs flip, match3 playable, connect paths, new memory, 8-tile spell; drop 假名重組/卡片塔

The quiz's tap-driven modes are reworked around what actually reads and plays well:

- 翻卡配對 cards now use a real 3D `.inner` flip; a mismatch keeps both faces open for ~1s (further taps ignored) and the view dispatches the new `quiz.resolve` to close and clear the flash, so the player can read what they picked. Reduced motion still holds the two faces.
- 消除下落 no longer deals a random board with no legal move, and no longer punishes starting a different chain. The board is generated and gravity-refilled to always contain at least one clearable 3+ group (`hasMatch3Move` + a deterministic stamp), only extending the current chain with a neighbouring different word costs a life, and a short hint line explains the rule. 4+ bonus, combo, and reset-on-clear stay.
- 路徑連接's BFS now returns the actual path (≤2 turns, cleared cells only). A successful pair draws the path, holds it ~0.7s, fades it, then clears via `quiz.resolve`; the opening board and every post-clear board keep at least one legal move by reshuffling the remaining cards (cleared holes stay) when none exists.
- 記憶順序 replaces the Simon sequence entirely: show 3 cards (日語/平假名) for ~3s or until `記住了`, cover them, then pick the 3 correct 中文 meanings from 6 options; wrong tap loses a life and reveals the next unsolved correct meaning before a retry.
- 拼字／打亂重組 now always deals exactly 8 tiles for short words (kana plus random distractors); a word longer than 8 keeps all its characters.
- 假名重組 and 卡片塔 are removed from the registry, engine, views, commands, storage normalization, docs, and tests. A stored setup containing them keeps the still-valid modes and drops the retired ids.

Nine concrete modes remain: 選擇題, 翻卡配對, 消除下落, 路徑連接, Boss 戰, 記憶順序, 拼字／打亂重組, 快速反應, 雙欄對決 — plus 隨機模式. `vol/` and the Google Tag IDs are unchanged.

## 2026-11-26 — 3×3 隨機抽卡 reveal

隨機模式's face-down draw shrinks from 9×9 (81 cards) to 3×3 (9 cards), one pick per round. The reveal is now a single continuous motion borrowed from the 3×3 命運抽卡 demo (not its game shell): the chosen card flies from its slot to the centre and grows to about `min(68vw, 270px)` (3:4) while its `.inner` flips `rotateY(0deg) → 90deg → 180deg` at the same instant; the other eight cards dim and blur; the card holds ~1.1s showing the drawn mode's label, then returns to its slot as the backdrop fades, and only then dispatches `quiz.tap`. The animation lives in `src/study/quiz/draw-animation.js` (presentation only — it never mutates the session), the view calls it from the card tap, and `src/views/QuizPlayView.vue` keeps template and scoped shell styles while the global `.draw-*` rules (cards, overlay, stage) sit in `src/styles/app.css`. A new `--draw-overlay` token covers light and dark. Under `prefers-reduced-motion: reduce` the flight and flip are skipped. `vol/` and the Google Tag IDs are unchanged.

## 2026-11-25 — quiz setup and 11 game modes

The blank quiz page is replaced by a two-screen quiz: `quiz` (setup) and `quiz-play` (rounds). The setup screen has 課次 multi-select, 單詞數量 (全部/100/50/30/10), 模式 multi-select (隨機模式 plus 11 concrete modes), 生命 (無限/10次/5次/3次/1次), and 時間 (無限/10秒/5秒/3秒); the selections persist under `study-minna-no-nihongo-vocabulary-basic-quiz`.

The round engine (`src/study/quiz/`) shuffles the chosen words, batches them into ≤10-word rounds, and plays the checked concrete modes in order (repeating), or a 3×3 face-down draw under 隨機模式. Lives are session-wide; a time limit shows a countdown bar that reuses the reading-progress tokens. The 11 concrete modes — 選擇題, 翻卡配對, 消除下落, 路徑連接, Boss 戰, 記憶順序, 拼字／打亂重組, 快速反應, 假名重組, 雙欄對決, 卡片塔 — are all playable through taps on rendered cards/tiles, with no keyboard and no `<input>`. `quiz.input` / `quiz.submit` / `quiz.advance` still do not exist; interaction uses `quiz.tap`, `quiz.choose`, `quiz.confirm`, `quiz.next`, `quiz.timeout`, `quiz.end`, and `quiz.nextRound`. `vol/` is unchanged and the Google Tag IDs stay empty.

## 2026-11-25 — storage keys renamed and migrated

The three storage keys are renamed to fit under Chrome's 64-ASCII-byte IndexedDB name cap and to stay collision-free with the conjugation site on the shared GitHub Pages origin (`study-minna-no-nihongo-vocabulary-basic` is 39 bytes, not 42):

- `words-settings` → `study-minna-no-nihongo-vocabulary-basic-settings` (48)
- `words-theme` → `study-minna-no-nihongo-vocabulary-basic-theme` (45)
- `words-dict` (IndexedDB, store `lists`) → `study-minna-no-nihongo-vocabulary-basic-dict` (44)

On first read or write the localStorage adapters copy the old value to the new key, keep the new value when both exist, and remove the old key; `save` writes only the new key and then tries to delete a leftover legacy key, and a failed read/write leaves the old key in place. On first open the IndexedDB adapter copies every record from the legacy `words-dict` store into the new database when the new store is empty, keeps new data when it already exists, and deletes the legacy database after a successful copy (or when it was empty); if the copy fails and the new store is still empty, the old database is left for a later retry. Legacy names are exported as `LEGACY_SETTINGS_KEY` / `LEGACY_THEME_KEY` / `LEGACY_IDB_NAME`, and test databases with custom names do not auto-migrate. `vol/` and the Google Tag IDs are unchanged.

## 2026-11-25 — home head aligned with the conjugation site

The home and loading head is now three lines, matching the conjugation site's SiteHead: the large title `大家の日本語`, the accent subtitle `單詞練習`, and the lede `涵蓋初級 1 – 50 課的單詞`. The theme switch moves from the title row to the subtitle row, 8px to the right of 習, on a `1fr auto 1fr` grid so the subtitle stays centred. The document title and product name remain `大家の單詞`. `vol/` and the Google Tag IDs are unchanged.

## 2026-11-25 — clickable 字形對照 and stroke-order detail page

Every comparison row in the word reader's 字形對照 block is now a keyboard-focusable button. A press opens a new `字形對照` page (back to the same word) with a table whose columns are exactly 簡 繁 日: `繁` and `日` come from the clicked pair's `zh` and `jp`, and `簡` is produced by `opencc-js` (Taiwan Traditional → Mainland Simplified, `tw` → `cn`) — never typed by hand. Same-code pairs such as 漢/漢 still appear; when `zh` is `null` (和製字 / kokuji) the 簡 and 繁 cells are empty and only 日 shows the Japanese character.

Below the table, a `播放筆順` button replays stroke-order animation: Traditional Chinese on the left and Japanese on the right. Stroke data is the KanjiVG data fetched by the kaki-jun library (`code4fukui/kaki-jun`); the library is not on npm, so its two used modules are vendored under `src/vendor/kaki-jun/` with attribution in `NOTICE.md`, and the fetched drawing is recoloured to `--ink`/`--muted`. A side with no KanjiVG data (or a network failure) shows `無筆順資料` without breaking the page. Under reduced motion, the play button shows the completed glyph instead of the per-stroke reveal. `vol/` is unchanged and the Google Tag IDs stay empty.


## 2026-11-25 — card setting 只顯示平假名

練習 settings gain `只顯示平假名` (default off), stored as `card.showHiraganaOnly` under `study-minna-no-nihongo-vocabulary-basic-settings`. When it is on, the `jp-zh` question shows the entry's `japanese` transcribed to hiragana (katakana letters only; nothing is invented). `一開始顯示讀音` stays in storage but the switch is disabled and has no effect until 只顯示平假名 is turned off. The `zh-jp` question and the card back are unchanged. `vol/` is not edited.


## 2026-11-25 — word reader: five example sentences and a clearer 字形對照

The 單詞 reader no longer draws a hairline under the tag row. Example sentences come first, then 字形對照. When 顯示例句 is on, the reader shows a random 5 of the entry's sentences (or all of them when there are fewer than 5), chosen once per `開始` and kept in dictionary order; it does not invent sentences or edit `vol/`. 字形對照 is a comparison grid: each pair is a 日 glyph, an arrow, and a 繁 glyph, with the existing `note` under the pair when present, and a Japanese-only cell when `zh` is `null`. The summary stays visible in muted text. Taiwan typography is unchanged: 台 is not rewritten as 臺, and `kanji_note` content is printed as stored.

A later pass on the same day centers the heading, the summary, every comparison row (including pairs with a note and Japanese-only rows), and the notes under pairs. The mixed two-column grid was dropped so alignment is consistent in the reader column. A further pass left-aligns the heading `字形對照` again and keeps the pairs, summary, and pair notes centered. Each comparison row now reads 繁 → 日 (Traditional first). A Japanese-only row is still used when `zh` is `null`.


## 2026-11-23 — revision 2, real `vol/` and a blank quiz

The vocabulary is `vol/lesson_1.json` … `vol/lesson_50.json` and `vol/schema.json`. Counted from those files: 50 lessons, 1,747 entries, 34,940 sentences, 20 sentences on every entry, no empty lesson. The display word is `kanji`, or `japanese` when `kanji` is `null`. The reader also shows `chinese`, speech and tag labels, `note`, `kanji_note` as 字形對照, and the sentences. `image` is always `null` and is not drawn.

`vol/` is read-only. The archive is `dict/vol.bin` with the 50 lesson files. The manifest is `src/data/vol-manifest.json`.

The 測驗 button stays. It opens a blank page: back and the title `測驗`, and an empty body. Keyboard, grading, quiz settings, and quiz completion are out of scope. T7 checks that the page stayed blank.

## 2026-11-23 — revision 1, name and empty Google Tag

The product name is `大家の單詞`. The document title and the large head use that string. The second head line stays `看單詞、翻卡、自己考自己`. The theme switch sits 8px after the 詞 of the title.

Google Tag is no longer out of scope. T9, after the app builds, adds the page-view hook with `GTM_ID` and `GA4_ID` set to `''`. Empty IDs load no script. Real IDs are pasted only when the user supplies them, and they are not copied from the conjugation site.

## 2026-11-23 — revision 0, documentation only

The repository starts as a spec pack for a vocabulary companion to `/project/game-japanese-katsuyou-basic`. No application is built in this revision. The word list is not included.

Decisions recorded for the implementing agent:

- Home has three entries, labeled 單詞, 練習, and 測驗. There is no 學習 entry and no 變形說明 flow.
- The brand is the blue palette in `docs/theme.md`, including a light theme and a dark theme. The katsuyou indigo/amber palette is not reused.
- 單詞, 練習, and 測驗 follow the reference app's dictionary, flashcard, and quiz interactions, with one word record instead of 15 conjugated forms. 練習 and 測驗 take a direction (看日文，答中文 / 看中文，答日文) instead of a 從/到 form matrix.
- `words/` stays empty aside from a placeholder the T2 agent adds. Boot must succeed with zero lessons. Storage keys are `study-minna-no-nihongo-vocabulary-basic-settings`, `study-minna-no-nihongo-vocabulary-basic-theme`, and IndexedDB `study-minna-no-nihongo-vocabulary-basic-dict`, so they do not collide with the conjugation site on the same GitHub Pages origin.
- Audio, a logo, and a fixed 50-lesson grid are out of scope until a later revision says otherwise. Analytics was moved into T9 by revision 1, with empty IDs.

Files: `README.md`, `AGENTS.md`, `docs/spec.md`, `docs/theme.md`, `docs/data-contract.md`, `docs/architecture.md`, `docs/development.md`, `docs/roadmap.md`, `docs/progress.md`, `docs/serving.md`, this file.
