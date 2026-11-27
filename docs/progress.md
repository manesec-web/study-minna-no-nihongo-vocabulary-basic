# Progress

Revision 2, 2026-11-23. T1–T9 are done. The site is a complete static Vue 3
SPA: loading → home (單詞 / 練習 / 測驗), a lesson picker, a word reader with
a directory, settings, and a clickable 字形對照 detail page, flashcards with a
completion panel, and a quiz setup + 9-mode round screen. Analytics is wired
with empty IDs.

## Done

- T1 Engine skeleton: `package.json`, `vite.config.js` (`base`
  `/study-minna-no-nihongo-vocabulary-basic/`, `outDir` `output`), `index.html`,
  `src/main.js`, `src/App.vue`, `src/engine/{registry,errors,settle,session}.js`,
  `src/dict/settings.js`, `src/ui/store.js`, `src/styles/app.css`, `.gitignore`.
- T2 Manifest and boot: `scripts/write-sha256.mjs`, `scripts/zip.mjs`,
  `scripts/vol-archive.mjs`, `src/data/vol-manifest.json` (50 lessons),
  `src/dict/{hash,archive,boot}.js`, `src/storage/idb.js` (`study-minna-no-nihongo-vocabulary-basic-dict` / `lists`),
  `src/commands/boot.js` (`app.boot`), the Vite dictionary plugin, and the
  `predev`/`pretest`/`prebuild` manifest check.
- T3 Loading, home, blue theme: the blue tokens from `docs/theme.md` (light +
  dark, dark painted in both the OS media query and `[data-theme='dark']`),
  `src/ui/{theme,theme-root,boot-progress,bootstrap}.js`,
  `src/storage/{theme,settings}.js`, `src/dict/library.js`,
  `src/commands/{theme,nav,index}.js`, components `SiteHead`, `ThemeToggle`,
  `BuildFooter`, `AboutSheet`, views `LoadingView`, `HomeView`, `QuizView`
  (blank), and `scripts/browser-check.mjs`.
- T4 Picker: `src/dict/lessons.js` (全選 label, empty/start hints),
  `src/study/{items,shuffle}.js`, `src/commands/{lessons,settings,study}.js`,
  `src/views/PickerView.vue`. `lessons.toggle` on an empty lesson returns
  `lesson-empty`; 全選 skips empty lessons; direction (card only, default
  `jp-zh`) is stored via `settings.patch`; `開始` carries the spec's disabled
  labels. `study.start` builds the frozen `{ lesson, index }` run (reader in
  lesson/vols order, card shuffled once) and opens `reader`/`card`.
- T5 Word reader: `src/dict/{ruby,romaji,labels}.js`, `src/study/{highlight,toc,window-views}.js`,
  `src/ui/{window,paging-window,swipe,drag,motion}.js`,
  `src/commands/word.js` (`word.next`/`word.prev` clamp, `word.goto`),
  component `RubyWord`, views `ReaderView` (display word, gloss, pills,
  `note`, 字形對照, 20 sentences, paging window + swipe), `TocView`
  (directory search incl. romaji), `SettingsView` (word switches). `word.goto`
  and leaving the directory discard `tocQuery`. The reader has no image slot
  and no 變形原理 control.
- T6 Cards: `src/commands/card.js` (`card.flip`/`card.next`/`card.prev`),
  `src/study/results.js`, `src/components/CompletePanel.vue`, `src/views/CardView.vue`
  (9-card paging window, 3D flip, tap-to-flip, swipe/footer paging, last-card
  完成), and `cardEntries` in `src/study/window-views.js` (face/back follow the
  direction). Completion shows one bowing emoji, the congratulation line, and
  返回主頁 — no score and no 錯誤的單詞 list.
- T7 Blank quiz page: the page from T3 stayed blank through T9, then was
  replaced by the quiz below. The view has no `<input>` and no `.quiz-key`,
  and no `quiz.input` / `quiz.submit` / `quiz.advance` command is registered.
- T8 Motion and archive build: the drawn 4px page thumb
  (`src/ui/{scrollbar,page-scrollbar}.js`, `src/components/PageScrollBar.vue`)
  and the non-passive touch guard (`src/ui/scroll-guard.js`, wired in
  `src/main.js`) land, so the native scrollbar stays hidden and iOS-style
  bounce is cancelled at the boundary. Reduced-motion CSS keeps the gradient
  still and fades screen changes.
- T9 Analytics hook: `src/config/analytics.js` (`GTM_ID` and `GA4_ID` both
  `''`), `src/analytics/{page-view,gtm}.js`, and the `session.screen` watcher in
  `src/main.js`. Empty IDs inject no `gtm.js` and no `gtag/js`; the page-view
  rules (titles, `#/<screen>` location, skip `loading` + first `home`) are pure
  and unit-tested.


## Follow-up (2026-11-25)

Word reader layout, after T9:

- No hairline under the tag row (the rule the user marked for deletion).
- 字形對照 moves below the 例句 block.
- 例句 shows a random 5 sentences per entry (all of them when fewer than 5),
  seeded by `session.runSeed` from `study.start`, stable for the run.
- 字形對照 is a comparison grid (繁 → 日, notes under a pair, Japanese-only
  when `zh` is null). Summary stays muted. No colour literals outside
  `app.css`. `vol/` is untouched.

Checks for this follow-up: `node scripts/write-sha256.mjs --check` passes
(`vol/` unchanged); `npm test` — 27 files, 155 tests passed; `npm run build`
writes `output/` with 50 lessons in `dict/vol.bin`; `node scripts/browser-check.mjs`
— all checks passed, including the new reader assertions (at most 5 sentences,
字形對照 after 例句, no hairline under the tags, comparison pairs). GTM/GA4 IDs
remain empty.


## Follow-up (2026-11-25, card 只顯示平假名)

練習 settings: `只顯示平假名` (`card.showHiraganaOnly`, default off). On a `jp-zh`
face the question is the stored `japanese` transcribed to hiragana. While it is
on, `一開始顯示讀音` is disabled and has no effect; its stored value is kept.
`zh-jp` and the back are unchanged. `vol/` is not edited.

## Follow-up (2026-11-25, 字形對照 details)

Each 字形對照 comparison row is a keyboard-focusable button. A press opens a
new `字形對照` page (back to the same word) with a 簡 繁 日 table: `繁`/`日`
come from the clicked pair's `zh`/`jp`, and `簡` is produced with `opencc-js`
(`tw` → `cn`), never typed by hand. `zh: null` (kokuji) leaves 簡/繁 empty and
shows only 日. A `播放筆順` button replays stroke-order animation — Traditional
left, Japanese right — via the vendored `code4fukui/kaki-jun` library
(`src/vendor/kaki-jun/`, see `NOTICE.md`) fetching KanjiVG data at run time; a
missing glyph shows `無筆順資料` without breaking the page. The fetched drawing
is recoloured to `--ink`/`--muted`. Reduced motion shows the completed glyph.

## Follow-up (2026-11-25, home head copy and theme switch)

The loading and home head is now three lines matching the conjugation
`SiteHead`: large title 大家の日本語, accent subtitle 單詞練習, lede 涵蓋初級
1 – 50 課的單詞 (en-dash U+2013). The theme switch moved from the title row to
the subtitle row — to the right of 單詞練習, via `SiteHead`'s `aside` slot and a
`.home-theme` span on the `1fr auto 1fr` subtitle grid — not beside the main
title. The document title / product name / analytics `SITE_TITLE` remain
大家の單詞. `vol/` and the Google Tag IDs are unchanged.

## Follow-up (2026-11-25, storage migration)

The storage keys were renamed and a one-time migration runs in the adapters:

- localStorage `words-settings` → `study-minna-no-nihongo-vocabulary-basic-settings` (48) and `words-theme` → `study-minna-no-nihongo-vocabulary-basic-theme` (45). On load/save the old value is copied to the new key when the new key is missing, the new value wins when both exist, the old key is removed, and a failed read/write leaves the old key in place.
- IndexedDB `words-dict` → `study-minna-no-nihongo-vocabulary-basic-dict` (44, store `lists`). On first open, records are copied from the old database into the new store when it is empty, existing new data is kept, and the old database is deleted after a successful copy (or when it was empty); a failed copy leaves the old database for a later retry.
- Legacy names are exported as `LEGACY_SETTINGS_KEY` / `LEGACY_THEME_KEY` (`src/dict/settings.js`, `src/ui/theme.js`) and `LEGACY_IDB_NAME` (`src/storage/idb.js`). Test databases with custom names do not auto-migrate. All new names are under Chrome's 64-ASCII-byte IndexedDB name cap.

`vol/` and the Google Tag IDs are unchanged.

## Follow-up (2026-11-25, quiz setup and 11 modes)

The blank quiz page becomes a two-screen quiz. `quiz` is the setup screen
(課次 multi-select, 單詞數量, 模式 multi-select with 隨機模式 + 11 concrete
modes, 生命, 時間, and a disabled 開始 that carries the no-lesson message);
`quiz-play` is the round screen. Setup persists under
`study-minna-no-nihongo-vocabulary-basic-quiz`. The engine lives in
`src/study/quiz/{modes,setup,faces,engine}.js`; `src/commands/quiz.js` is the
dispatch layer; `src/storage/quiz.js` is the setup adapter. All 11 modes —
選擇題, 翻卡配對, 消除下落, 路徑連接, Boss 戰, 記憶順序, 拼字／打亂重組,
快速反應, 假名重組, 雙欄對決, 卡片塔 — are playable through taps, with a
countdown bar reusing the reading-progress tokens and session-wide lives.
`quiz-play` back returns home; there is no keyboard and no `<input>`.

## Follow-up (2026-11-26, 3×3 隨機抽卡 reveal)

隨機模式's draw grid changes from 9×9 (81 cards) to 3×3 (9 cards), and the
flat `?` tap becomes a full reveal animation modelled on the 3×3 命運抽卡 demo
(its motion, not its game shell): a pick flies from its slot to the centre and
grows to about `min(68vw, 270px)` (3:4) while its `.inner` flips `rotateY`
0°→90°→180° at the same instant, the other eight cards dim and blur, the card
holds ~1.1s showing `MODE_LABELS[card]`, then returns to its slot as the
backdrop fades — and only then is `quiz.tap` dispatched. `src/study/quiz/draw-animation.js`
owns the presentation sequence (it never mutates the session); the view calls it
from the card tap, and the global `.draw-*` rules live in `src/styles/app.css`
with a new `--draw-overlay` token for light and dark. Under
`prefers-reduced-motion: reduce` the flight and flip are skipped and the card
flips in place. `DRAW_CARDS` is 9, and the 9×9/81 references in the docs and
comments now read 3×3/9. `vol/` and the Google Tag IDs are unchanged.

## Follow-up (2026-11-27, quiz mode fixes and two mode removals)

The quiz modes are tightened and the two redundant modes are removed:

- 翻卡配對: cards use a 3D flip; a mismatch keeps both faces open ~1s before
  `quiz.resolve` closes them.
- 消除下落: boards always contain a clearable 3+ group, and starting a different
  chain is a re-selection (no life loss); only extending the chain with a
  neighbouring different word is a mistake. A hint line explains the rule.
- 路徑連接: `findConnectPath` returns the real path, which is drawn, held ~0.7s,
  then cleared; boards reshuffle remaining cards when no legal move remains.
- 記憶順序: the Simon sequence is replaced by show-3-cards then pick the 3
  correct 中文 meanings from 6 options.
- 拼字／打亂重組: exactly 8 tiles for short words, long words keep all kana.
- 假名重組 and 卡片塔 are removed everywhere; stored setups drop those ids and
  keep valid modes.

Nine concrete modes remain: 選擇題, 翻卡配對, 消除下落, 路徑連接, Boss 戰,
記憶順序, 拼字／打亂重組, 快速反應, 雙欄對決. `vol/` and the Google Tag IDs are
unchanged.

## Follow-up (2026-11-27, quiz mode regressions)

A second pass fixed the regressions found in the first quiz-mode round:

- 翻卡配對 cards start face-down (`?` front, text face backface-hidden); the
  quiz drops the `正確`/`錯誤` feedback text entirely, keeping visual cues and
  the `正確答案：…` reveal only.
- 消除下落 guarantees a real connected 3+ group by word id, penalises only
  illegal extensions (non-adjacent same word / neighbouring different word),
  and re-selects on a different group's start. Unit tests cover the real
  第16課 顔/かお/臉 aliases, an L-shaped group, several seeds, and a clickable
  BFS-ordered path.
- 路徑連接 restores uncleared-card surfaces, only cleared cells turn
  transparent, the 6×6 grid fits with `minmax(0, 1fr)` and length-based font
  classes, and the path is a measured SVG polyline that realigns after resize.
- Boss 戰 HP is monotonic (wrong never raises it, correct lowers it).
- 快速反應 separates prompt/answer languages, keeps option texts unique, and
  clears the wrong-card frame and stale text on the next question.
- 翻卡配對 additionally lays out 4 columns × 5 rows on mobile (5 × 4 on
  desktop) while keeping the face-down `?`; 快速反應's big prompt no longer
  carries a leading `:`/`：`.

## Follow-up (2026-11-27, ten new quiz modes)

The quiz grows to 19 concrete modes (plus 隨機模式). The ten new modes —
極速是非, 找出內鬼, 缺字填空, 猜假名, 迷你填字, 三元消消樂, 隕石防禦, 打地鼠,
去漢字盲測, 振假名狙擊 — each live in a per-game state machine
(`src/study/quiz/games/game-*.js`) and a per-game component
(`src/views/games/game-*.vue`). `QuizPlayView.vue` is now a host shell that
resolves the active mode to its component; setup eligibility is computed from
the selected lessons and disables ineligible chips with a reason, and
`beginNext` safely skips ineligible modes. The newer games use the generic
`quiz.act` command for their non-tap inputs.

## Follow-up (2026-11-27, eight more quiz modes)

Eight more per-game modes land, bringing the total to 27 concrete modes plus
隨機模式: 單字麻將, 濁音排雷, 迴轉壽司, 找碴讀音, 音拍猜謎, 尋字迷宮,
單字貪食蛇, 五十音劊子手. Each has its own `game-*.js` / `game-*.vue`, setup
eligibility, and unit tests (win/fail/input/edge cases plus seeded generator
invariants for the board generators). `scripts/browser-check.mjs` renders and
operates every mode at 390px/1024px. The official chrome-devtools MCP was used
in an isolated browser context to load the app, seed 五十音劊子手, open its
board, and capture screenshots under `test-artifacts/quiz-modes/`.

## Follow-up (2026-11-27, four quiz modes: pairs peek, match3 10-group win, connect 9 rows, memory table)

Four quiz modes get a rule + animation pass, all through Vue + CSS + dispatch:

- 翻卡配對: the round opens with a staggered all-face-up deal — cards flip open
  in a wave, hold a ~2s peek (kept under reduced motion), then flip back
  face-down in a reverse wave. `quiz.resolve` ends the peek; a mismatch still
  holds ~1s. `game-pairs.vue` + `pair-deal-up`/`pair-deal-down` keyframes.
- 消除下落: the round now ends after **10 cleared groups** (`round.state.clearCount`),
  not 10 tiles. The opening drop-in and post-clear gravity are animated — a
  column-staggered fall with overshoot settle, a scale pop on cleared tiles
  before gravity, and new tiles fall from above — while `hasMatch3Move` /
  `ensureMatch3Move` keep every deal and refill solvable. The countdown is held
  during the opening drop-in and starts when `quiz.resolve` unlocks the board;
  the `結束本模式` button and `quiz.end` command are removed. `game-match3.vue`
  keys cells by a per-tile id so only freshly dealt tiles re-animate.
- 路徑連接: `CONNECT_ROWS` changes 6 → 9 (6×9, 54 cells, 27 pairs). The grid
  stays `repeat(6, minmax(0, 1fr))`; the measured path SVG and keep-a-move
  shuffle work unchanged on the taller board.
- 記憶順序: the static "show 3 cards + 記住了" intro becomes a 12-card face-down
  poker table — the three target words flip open in sequence, hold long enough
  to read, then vanish — and the Chinese question starts automatically (no
  button, still untimed, wrong-answer rules unchanged). `game-memory.vue` owns
  the deal/flip/vanish sequencing and dispatches `quiz.next`.

Checks for this follow-up: `node scripts/write-sha256.mjs --check` passes
(`vol/` unchanged); `npm test` — 40 files, 296 tests passed (including new
pairs-peek, match3 clear-count, connect 6×9, and memory-table cases);
`npm run build` writes `output/` with `dict/vol.bin` at 50 lessons and no
`schema.json`; `node scripts/browser-check.mjs` — all checks passed, including
the new pairs deal peek, connect 9-row fit/path, and memory poker-table
auto-advance assertions. GTM/GA4 IDs remain empty.

## Follow-up (2026-11-27, four quiz modes redesigned: pairs 3s peek + 4×5, match3 random solvability, connect 8×5, memory pile-to-slots)

A redesign replaces the previous layout, timing, and memory flow for the same
four quiz modes (no canvas engine; Vue + CSS + delayed dispatch):

- 翻卡配對 is a fixed 4×5 grid (20 cards, 10 pairs). A 3s peek bar above the
  board counts down; taps and the quiz clock are held during the peek, and
  `quiz.resolve` starts play + the countdown when the bar finishes and the
  cards flip face-down. Reduced motion keeps the 3s peek and only shortens the
  flip. `game-pairs.vue`, `pairs-peek` bar in `quiz-games.css`.
- 消除下落 drops the fixed top-left stamp: `ensureMatch3Move` reshuffles the
  freshly dealt cells (survivors stay after gravity) a bounded number of tries
  for a natural group, then plants a 3-cell group at a random position/shape
  only as a last resort. 10 cleared groups still win; drop/gravity/pop motion
  unchanged.
- 路徑連接 changes 6×9 → 8×5 (40 cells, 20 pairs): `CONNECT_COLS` 5,
  `CONNECT_ROWS` 8, `repeat(5, minmax(0, 1fr))`; the measured path SVG works
  unchanged.
- 記憶順序 is rebuilt: bottom pile → one tap → three cards dealt into three
  slots one by one → 2s countdown (words readable) → six 中文 options placed
  into slots 1/2/3 → third placement grades all three and flips the slots to
  show right/wrong. Wrong loses one life and retries the same group; the clock
  is held until the options are interactable. No 記住了 button.

Checks for this follow-up: `node scripts/write-sha256.mjs --check` passes
(`vol/` unchanged); `npm test` — 40 files, 301 tests passed; `npm run build`
writes `output/` with `dict/vol.bin` at 50 lessons; `node scripts/browser-check.mjs`
— all checks passed (pairs 4×5 + 3s peek, match3 solvable group, connect 8×5
fit/path, memory pile → deal → countdown → place → check). GTM/GA4 IDs remain
empty.

## Follow-up (2026-11-27, remove trimatch/furigana, whack one-mole cycle, mahjong 3D depth)

Three changes layered on the previous redesign (no canvas engine):

- `trimatch` (三元消消樂) and `furigana` (振假名狙擊) are removed end to end:
  `CONCRETE_MODES` / `MODE_LABELS` / `SETUP_MODES`, `NEW_GAMES`,
  `GAME_COMPONENTS`, eligibility, tests, and `browser-check.mjs` all drop them,
  and their `game-*.js` / `game-*.vue` files are deleted. 25 concrete modes
  remain; a stored setup drops the retired ids through `isMode`.
- `whack` (打地鼠) now shows one mole at a time on a 1s-up / 2s-down cycle
  driven by the existing 1s `visibility-interval` tick: up hides, two down
  ticks re-appear. Each appearance picks a different hole than the last and a
  different word/face; the nine holes are never all one text. Reduced motion
  only shortens the pop animation, never the up/down intervals.
- `mahjong` (單字麻將) re-renders its stacks with real depth: absolute tile
  positions, per-layer offsets, a `::after` 3D side in `--surface-strong`, and
  a collapse in `refresh` so a covered tile peeks out under the one above and a
  removed tile lets the stack settle up. The mahjong rules are unchanged.

Checks for this follow-up: `node scripts/write-sha256.mjs --check` passes
(`vol/` unchanged); `npm test` — 40 files, 301 tests passed; `npm run build`
writes `output/` with `dict/vol.bin` at 50 lessons; `node scripts/browser-check.mjs`
— all checks passed (25-mode setup, whack one-mole cycle, mahjong stacked
board). GTM/GA4 IDs remain empty.

## Follow-up (2026-11-27, 10s 提示 button)

Every concrete quiz mode gains a one-shot `提示` button at the top right of the
`quiz-play` bar, appearing after 10 seconds of continuous actionable time.
`src/study/quiz/hint.js` holds the pure rules — `hintRule` (reset key +
whether the player can act) and `applyHint` (one `round.hintEffect` per mode) —
and `src/commands/quiz.js` recomputes `round.hint` after each action and exposes
`quiz.hintReady` / `quiz.hint`. `QuizPlayView.vue` accumulates the 10s (pausing
during held clocks and resetting on key changes) and renders the button; each
`game-*.vue` reads `round.hintEffect` to highlight the correct choice/card/pair/
group, reveal one kana or a reading, or outline the right judgement. 打地鼠 gets
a per-target `turn` so its hint resets with each mole board. The hint never
auto-solves a whole board and stays one per question/board. `vol/`, the Google
Tag IDs, and the colour tokens are unchanged.

## Follow-up (2026-11-27, four quiz fixes: nokanji blank board, mahjong pile, kanatrap 10, snake fine grid)

- 去漢字盲測: `game-nokanji.js` `buildQuestion` returned `undefined`, so from
  the second question on `advanceQuestion` stored `undefined` and the board
  rendered blank. It now returns the question; tests play through several
  questions and `quiz-view.test.js` server-renders each question mode's
  component on its second question.
- 單字麻將: a 羊了個羊-style three-layer half-offset pyramid with taller
  corner piles — 24 / 30 / 54 tiles by word count — placed by percentage of a
  unit box with `cqw` type (≈56×73 px phone, ≈68×88 px desktop; was 48×68 ×18).
  Rules unchanged; `solutionOrder` (layers top-down, rows left→right, triples
  dealt A B C A B C A B C) is provably solvable and is played end-to-end in a
  unit test and in `browser-check`.
- 濁音排雷: 10 questions per round (was 1), pool reuse under 10 words, round
  clears after 10 answers, hint clock per question, `第 n / 10 題` line.
- 單字貪食蛇: 13×17 mostly-empty grid; kana along a reserved self-avoiding
  walk (`state.route`), wrong kana off it; correct kana stay gone (snake
  grows), wrong kana shrink the snake and return after 1s via
  `state.respawn` + `src/study/quiz/respawn-timer.js` (delayed `quiz.act
  respawn`); wall/self costs a life and resets only the snake.
- Docs: `spec.md` modes 17/18/19/24, `architecture.md` (`quiz.act` respawn),
  `roadmap.md` follow-up line, this file, `changelog.md`.

## Follow-up (2026-11-27, 音拍猜謎 retired, 單字麻將 pile + tray framed)

- 音拍猜謎 (mora) is removed from the quiz: `game-mora.js` / `game-mora.vue`
  deleted, the mode dropped from `CONCRETE_MODES` / `SETUP_MODES` /
  `MODE_LABELS`, `NEW_GAMES`, `GAME_COMPONENTS`, eligibility, and `hint.js`.
  24 concrete modes plus 隨機模式 remain; an end-to-end removal test and a
  browser-check mode-count assertion guard the set.
- 單字麻將: the pile box and the 托盤 n / 7 caption + seven-slot tray now sit
  inside one visible `.mahjong-frame` (border, tint, shadow, `overflow:
  hidden`, padding that keeps the 3D sides and the covered-tile peek inside).
  The pile height is a `padding-top` ratio (`boardRatio`), the frame is
  clamped on short windows with dvh, and tile text clips instead of pushing
  tiles out. `browser-check` plays at a ~520px width with tiles on the pile
  and in the tray and asserts every tile/slot/text rectangle stays inside the
  frame.
- Docs: `spec.md` mode 18 frame rule, `changelog.md`, this file.
- Checks: `npm test` — 42 files, 324 tests passed; `npm run build` — ok,
  `output/dict/vol.bin` 50 lessons; `node scripts/browser-check.mjs` — 203
  checks pass, including the 24-mode setup list, the ~520px mahjong frame
  containment, and the existing mahjong play-through (the snake respawn check
  is timing-sensitive and passes on re-run).

## Follow-up (2026-11-27, 單字麻將 tile faces: solid tiles + frost veil)

- Visual-only: `.mahjong-tile--blocked` no longer uses whole-tile `opacity:
  0.72` (covered faces went see-through and overlapping glyphs mashed
  together). Covered tiles keep a solid body, dimmed by one uniform frost
  veil (`::before`), with dimmed type, a small layer shadow, and the darker
  3D side — the 羊了個羊 peek-under stays without the text mash. Free tiles
  pop with a stronger lift shadow; tray tiles keep the same chrome.
  New tokens `--mahjong-veil` / `--mahjong-blocked-ink` / `--mahjong-side` /
  `--shadow-tile` in `app.css` (both dark blocks) and `theme.md`;
  `quiz-games.css` uses only `var(--…)`. Rules, geometry, and the frame are
  unchanged.
- Docs: `spec.md` mode 18 tile-treatment sentence, `theme.md`,
  `changelog.md`, this file.
- Checks: `npm test` — 42 files, 324 tests; `npm run build` — ok (50
  lessons); `node scripts/browser-check.mjs` — all pass, the ~520px frame
  check now also locks blocked-solid + frost-veil + free-solid; light/dark
  screenshots reviewed in `/tmp/quiz-refs/shots/`. Snake respawn check is
  timing-flaky and passes on re-run.

## Follow-up (2026-11-27, Boss 戰 marks, 極速是非 ⭕/❌, 找出內鬼 list, 6×6 kana pads)

- Boss 戰 / 選擇題: the picked choice is marked with the bare `✓` / `✗` icon
  in an absolute slot at the right of the button; the label no longer shifts
  and no `正確`/`錯誤` text is printed.
- 極速是非: icon-only `❌` / `⭕` buttons (accessible names 錯誤配對 /
  正確配對); a wrong judgement turns the card and the pressed button red
  (border + text) and the next question follows after ~3s, a correct one
  after ~0.5s, both through `quiz.next` (no reveal / `確定`).
- 找出內鬼: a one-per-row list (`.oddone-grid--list`), Japanese left and
  Chinese right.
- 猜假名 / 五十音劊子手: 6×6 pads from `buildKanaPad` (`games/shared.js`) —
  the 36 most frequent kana in gojuon order, the answer's kana always swapped
  in; `round.state.pad` feeds both views.
- Fixed the non-terminating `buildPad` loop in 迴轉壽司 (shuffle-then-take).
- Docs: `spec.md` modes 1, 5, 10, 11, 13, 24; `changelog.md`; this file;
  `roadmap.md` follow-up sentence.
- Checks: `npm test` — 42 files, 329 tests; `npm run build` — ok (50
  lessons); `node scripts/browser-check.mjs` — 218 checks pass. Review
  screenshots (390px, light + dark) under `/tmp/quiz-refs/shots/gb-*.png`.

## Checks run (final)

Review A (2026-11-27) completed the previously-noted gaps: wordsearch drag +
keyboard input, snake direction queue + WASD/arrow/touch, mahjong real layered
stacking with side-blocking and provable removal, sushi full romaji (dakuten /
small kana / っ / ん / ー) + IME composition guard, crossword adjacent-parallel
rejection with a validating invariant, and visibility-paused timers for
falling/whack.

- `node scripts/write-sha256.mjs --check` — passes; `vol/` bytes unchanged.
- `npm test` — 40 files, 296 tests passed (registry, boot fixtures, idb, archive,
  settings schema, theme rules, boot progress, nav, lessons, study, word, card,
  glyph, ruby, romaji, labels, highlight, toc, window-views, swipe/drag/window,
  scrollbar, quiz-view, glyph-view, quiz engine + commands + setup + the ten
  earlier new modes + the eight latest modes, analytics, colour-literal scan).
- `npm run build` — writes `output/index.html`; `output/dict/vol.bin` has 50
  ZIP entries and no `schema.json`; no runtime Google script (IDs empty).
- `node scripts/browser-check.mjs` — passes: loading, home, theme, About, quiz
  setup + play (27 concrete modes render, no input except 迴轉壽司 typing), the
  four animation-pass modes (pairs deal peek + face-down play, match3 clickable
  group + no life loss + 10-group win, connect 6×9 surfaces/fit/path/cleared
  holes + desktop + dark, memory poker-table deal + auto-advance), boss HP
  monotonic, reaction language split + no stale flash, all eighteen newer modes
  render and accept a core interaction, picker, reader, clickable 字形對照
  pairs, the glyph page table and play button, directory search, cards,
  completion.

## Not done

- Nothing on the board remains. `GTM_ID` / `GA4_ID` stay `''` until the user
  supplies real values.

## Next

Deploy: publish the contents of `output/` at the root of the GitHub Pages
branch (`https://manesec-web.github.io/study-minna-no-nihongo-vocabulary-basic/`).
