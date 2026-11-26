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

## Checks run (final)

Review A (2026-11-27) completed the previously-noted gaps: wordsearch drag +
keyboard input, snake direction queue + WASD/arrow/touch, mahjong real layered
stacking with side-blocking and provable removal, sushi full romaji (dakuten /
small kana / っ / ん / ー) + IME composition guard, crossword adjacent-parallel
rejection with a validating invariant, and visibility-paused timers for
falling/whack.

- `node scripts/write-sha256.mjs --check` — passes; `vol/` bytes unchanged.
- `npm test` — 40 files, 291 tests passed (registry, boot fixtures, idb, archive,
  settings schema, theme rules, boot progress, nav, lessons, study, word, card,
  glyph, ruby, romaji, labels, highlight, toc, window-views, swipe/drag/window,
  scrollbar, quiz-view, glyph-view, quiz engine + commands + setup + the ten
  earlier new modes + the eight latest modes, analytics, colour-literal scan).
- `npm run build` — writes `output/index.html`; `output/dict/vol.bin` has 50
  ZIP entries and no `schema.json`; no runtime Google script (IDs empty).
- `node scripts/browser-check.mjs` — passes: loading, home, theme, About, quiz
  setup + play (27 concrete modes render, no input except 迴轉壽司 typing), the five regression modes
  (pairs face-down + no feedback text, match3 clickable group + no life loss,
  connect surfaces/fit/path/cleared holes + desktop + dark, boss HP monotonic,
  reaction language split + no stale flash), all eighteen newer modes render and
  accept a core interaction, picker, reader, clickable 字形對照 pairs, the
  glyph page table and play button, directory search, cards, completion.

## Not done

- Nothing on the board remains. `GTM_ID` / `GA4_ID` stay `''` until the user
  supplies real values.

## Next

Deploy: publish the contents of `output/` at the root of the GitHub Pages
branch (`https://manesec-web.github.io/study-minna-no-nihongo-vocabulary-basic/`).
