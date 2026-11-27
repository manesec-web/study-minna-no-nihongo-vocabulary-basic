# Architecture

Revision 2, current state (post-T9 and the 2026-11-25 follow-ups). The tree below is what T1–T9 and the follow-ups create. Behavior: [`spec.md`](spec.md). Data bytes: [`data-contract.md`](data-contract.md). Colour: [`theme.md`](theme.md). `vol/` is already in the repo and is read-only.

Reference implementation to read, not to import and not to modify:

`/project/game-japanese-katsuyou-basic`

## Shape

One static Vue 3 SPA built with Vite. No router, no backend, no MCP, no model call. Runtime fetches same-origin `dict/vol.bin` (50 lesson files from `vol/`). Google Tag is wired in T9 with empty IDs, so the shipped site loads no Google script until those two strings are filled. The quiz is a setup screen (`quiz`) plus a tap-driven round screen (`quiz-play`) with 24 concrete modes; its rules live in `src/study/quiz/` and `src/commands/quiz.js`.

Three layers:

- `src/engine/` — framework-free `dispatch` and a plain session.
- `src/commands/` — one module per area, each exporting `specs()`.
- `src/views/` and `src/components/` — thin Vue. A `.vue` file holds template and style. It calls `store.send(id, params)` and renders state. It does not decide grading, selection, or boot.

`src/ui/store.js` wraps the session in `reactive()` and exposes `send`. `src/main.js` resolves the start theme, registers commands, mounts, and runs bootstrap.

## What to reimplement from the reference

Read these and keep the cited behavior. Storage keys are renamed with migration (see Storage migration). Recolour only through tokens. Do not add a runtime dependency on the other repo.

| Reference area | Keep |
|---|---|
| `src/engine/registry.js`, `errors.js`, `settle.js` | Command envelope, disabled commands, `CommandError` |
| `src/ui/swipe.js`, `drag.js`, `motion.js`, `paging-window.js`, `window.js` | Finger-tracking paging, 5- and 9-item windows |
| `src/ui/scroll-guard.js`, `scrollbar.js`, `page-scrollbar.js`, `element-thumb.js` | Bounce guard and drawn thumbs |
| `src/ui/boot-progress.js` | Bar that never moves backwards. `total` comes from the manifest |
| `src/ui/theme.js`, `theme-root.js`, `src/storage/theme.js` | OS theme, then stored choice. Key `study-minna-no-nihongo-vocabulary-basic-theme` |
| `src/dict/ruby.js`, `romaji.js`, `hash.js`, `archive.js` | Ruby alignment, Hepburn lookup, sha256, ZIP via `unzipit` |
| `src/dict/boot.js`, `src/storage/idb.js` | Two-phase boot, one retry. Database `study-minna-no-nihongo-vocabulary-basic-dict`, store `lists`. Archive `dict/vol.bin`, 50 entries |
| `src/components/SiteHead.vue`, `ThemeToggle.vue`, `BuildFooter.vue`, `AboutSheet.vue`, `RubyWord.vue`, `CompletePanel.vue`, `PageScrollBar.vue`, `ScrollThumb.vue` | Structure and copy from this spec. The home head is `大家の日本語`, then `單詞練習`, then `涵蓋初級 1 – 50 課的單詞` |
| `src/analytics/page-view.js`, `src/analytics/gtm.js`, `src/config/analytics.js` | T9 only. Same page-view rules. `GTM_ID` and `GA4_ID` stay `''`. Do not copy the reference ID constants |

## What to leave out

Do not port these, and do not leave unused copies in the tree:

- `src/study/rule*`, `src/commands/rule.js`, `src/commands/reader-rule.js`, `src/data/rule-content.js`, `scripts/generate-rule-content.mjs`
- The conjugation analytics IDs. The modules are reimplemented in T9; the ID strings are not
- `src/dict/audio*`, `src/dict/md5.js`, `src/commands/audio.js`, `src/storage/audio-idb.js`, `scripts/fetch-audio.mjs`, `scripts/*audio*`, `scripts/*res-archive*`
- Views `LearnView.vue`, `RuleView.vue`, `ExampleView.vue`
- The conjugation repo's `vol/` (different shape). This repo's `vol/` is the vocabulary source and stays byte-for-byte
- `dict/resource/`, the conjugation logo
- `src/dict/quiz-grade.js` and any `quiz.input` / `quiz.submit` / `quiz.advance` command (the quiz is tap-driven and has no keyboard)
- Any command id starting with `dict.` or `rule.`
- The 15-form tables, `error_usage`, and 從/到

## Command contract

A spec is `{ id, params, enabled?, run }`. `run` mutates the session in place. `app.boot` is async. `dispatch(session, id, params)` returns `{ ok: true, result }` or `{ ok: false, error: { code, message, ...details } }`. Async commands return a Promise of that envelope.

Unknown id → `unknown-command`. Bad params → `invalid-params` or `missing-param`. `enabled === false` → `command-disabled` and `run` is not called. A thrown error → `command-failed`, unless it is a `CommandError` with a string `code`. Bad params, an empty library, and a hash mismatch do not escape as uncaught exceptions.

Command-level codes: `boot-failed`, `library-missing`, `library-invalid`, `lesson-empty`, `invalid-settings`, `no-items`, `invalid-index`.

| id | Effect |
|---|---|
| `app.boot` | Hash IndexedDB lessons against the manifest (`boot.total` is 50). Fetch `dict/vol.bin` once, one retry, store only matching entries. Set `boot.error` on failure |
| `nav.go` | `params.screen`, optional `params.mode` |
| `lessons.toggle` | Toggle one lesson number. A lesson whose `vols` is empty → `lesson-empty` and no change |
| `lessons.selectAll` | Clear when every non-empty lesson is selected; otherwise select every non-empty lesson. Per mode |
| `study.start` | Build the frozen item list and open `reader` or `card`. Mode `quiz` is `invalid-params`. No entries → `no-items` |
| `study.finish` | End the card run and show completion |
| `word.next` / `word.prev` | Move inside the reader list, clamped |
| `word.goto` | `params.index` integer inside the run, else `invalid-index` |
| `card.flip` | Swap face and back |
| `card.next` / `card.prev` | Move and turn the new card face-up |
| `glyph.open` | `params.detailIndex`. From the reader, records the clicked 字形對照 pair (its `zh`, `jp`, `note`, and the opencc `簡` cell) and opens `glyph` |
| `glyph.play` | Bump `glyphPlayCount` so the view replays both stroke panels |
| `settings.patch` | Merge a known field. One unknown field rejects the whole patch with `invalid-settings` |
| `theme.toggle` | Flip theme, set source `user`, store `study-minna-no-nihongo-vocabulary-basic-theme` |
| `quiz.toggleLesson` / `quiz.selectAll` | Edit the quiz setup's lesson selection (an empty lesson → `lesson-empty`) |
| `quiz.setCount` / `quiz.setLives` / `quiz.setTime` | Set one quiz setup option (validated, `invalid-settings` on a bad value) |
| `quiz.toggleMode` / `quiz.toggleRandom` | Toggle one concrete mode, or the 隨機模式 flag, in the quiz setup |
| `quiz.start` | Build the quiz run (shuffle, batch by 10, resolve mode order) and open `quiz-play` |
| `quiz.tap` | Tap a 3×3 draw card, or a card/tile/cell in the active mode |
| `quiz.choose` | Choose a multiple-choice answer in the active mode |
| `quiz.act` | Generic `{ type, index, value }` action for the newer games (swipe judgement, wordle/crossword input, falling/whack/snake ticks, direction queue, and the snake's delayed `respawn` of a wrong kana) |
| `quiz.confirm` / `quiz.next` | Acknowledge a reveal, or advance through 記憶順序's deal/countdown/check phases |
| `quiz.resolve` | End the 翻卡配對 opening 3s peek or close a held mismatch, settle a 消除下落 drop/clear, or clear a 路徑連接 pair after the path reveal |
| `quiz.timeout` | The countdown reached 0; the active mode decides what that means |
| `quiz.hintReady` | Mark the 10s hint button available (only while a hint clock is active) |
| `quiz.hint` | Apply the one-shot per-mode hint via `round.hintEffect` and mark it used |
| `quiz.nextRound` | Advance to the next batch/draw after a round completes |

Screens and modes: [`spec.md`](spec.md). `nav.go` with `screen: 'quiz'` opens the setup screen and does not set a study mode or build items; `quiz.start` moves to `quiz-play`.

## Session

`createSession()` returns plain data:

- `screen` — starts at `loading`
- `mode` — `words` or `card`, or `null` on `home`, `loading`, `quiz`, and `quiz-play`
- `settings` — the object in spec → Saved settings, after load
- `items` — frozen `{ lesson, index }` run, or `[]`. `lesson` is the number N. `index` is the position in that lesson's `vols`
- `index` — number, the position in `items`
- `flipped` — boolean
- `finished` — boolean, card completion only
- `boot` — `{ checked, total, done, error, running, download: { loaded, total } }`
- `theme` — `{ value: 'light' | 'dark', source: 'system' | 'user' }`
- `tocQuery` — string, page-local, not persisted
- `runSeed` — unsigned 32-bit integer, drawn in `study.start`, seeds the reader's 5-sentence sample
- `glyph` — `null`, or the open 字形對照 pair: `{ lesson, index, detailIndex, zh, jp, note, simplified, hasTraditional }`
- `glyphPlayCount` — number, bumped by `glyph.play`; the glyph view watches it to replay both stroke panels
- `quiz` — the quiz setup (lessons, count, modes, random, lives, time) plus `quiz.run` (null until `quiz.start`). The run holds item references and per-round derived state; word bodies are resolved through the injected library at round build time

The library lives beside the session, injected into commands. The session does not hold word bodies. Commands own transitions. Derived labels are computed when rendered, not stored a second time.

`src/ui/bootstrap.js` awaits `app.boot`, loads settings and the library, then enters `home`. `boot.running` blocks a second boot. On failure the loading view stays and retry calls `app.boot` again.

## Shuffle

`study.start` for `card` shuffles a copy of the selected entries once. The function takes `random`, default `Math.random`. Tests pass a deterministic function. The reader does not shuffle the word list. Its example sentences are a random sample of 5, seeded by `runSeed`. `quiz` never calls `study.start`; `quiz.start` runs its own shuffle through `src/study/quiz/engine.js`.

## File map to create

```text
vol/lesson_1.json … lesson_50.json   read-only vocabulary, plus schema.json
vol/.pi/                       gitignored, not packed
docs/                          this pack
scripts/write-sha256.mjs       hash vol/lesson_*.json, validate, --check
scripts/vol-archive.mjs        pack dict/vol.bin with the 50 lesson files
scripts/browser-check.mjs      headless Chromium against vite preview
src/main.js
src/App.vue
src/engine/                    registry.js, errors.js, session.js, settle.js
src/commands/                  boot, nav, lessons, settings, study, word, card, glyph, theme, quiz
src/dict/                      hash, archive, boot, library, ruby, romaji, settings, labels, glyph
src/storage/                   idb.js, settings.js, theme.js, quiz.js
src/study/                     items.js, shuffle.js, toc.js, glyph-strokes.js
src/study/quiz/                modes.js, setup.js, faces.js, engine.js, eligibility.js, draw-animation.js, cell-font.js, connect-path.js, swipe-gesture.js
src/study/quiz/hint.js         the 10s hint clock rules + per-mode hint effects
src/study/quiz/games/          shared.js, index.js, game-*.js (25 per-game state machines + helpers)
src/ui/                        store, bootstrap, boot-progress, theme, theme-root,
                               gestures, scrollbars, motion, paging
src/views/                     Loading, Home, Picker, Reader, Toc, Glyph, Card, Quiz (setup), QuizPlay, Settings
src/views/games/               index.js, game-*.vue (one component per concrete mode)
src/styles/quiz-games.css      game board styles (var() tokens only)
src/components/                SiteHead, ThemeToggle, BuildFooter, AboutSheet,
                               RubyWord, CompletePanel, PageScrollBar, ScrollThumb
src/vendor/kaki-jun/           vendored stroke-order library (see NOTICE.md):
                               createKanjivg.js, dist/KanjivgAnimate.js
src/styles/app.css
src/data/vol-manifest.json     50 lesson records, generated, committed
index.html                     title 大家の單詞, theme-color #0d2a52, no icon links
src/config/analytics.js        T9: GTM_ID and GA4_ID, both ''
src/analytics/                 T9: page-view.js, gtm.js
vite.config.js                 base /study-minna-no-nihongo-vocabulary-basic/, outDir output
output/                        gitignored
```

No `public/` directory. Vite middleware serves `dict/vol.bin` in dev from `vol/lesson_*.json`.

## Settings module

`src/dict/settings.js` is the pure schema: defaults, the list of known fields, and `patch` that rejects unknown keys. `src/storage/settings.js` reads and writes `study-minna-no-nihongo-vocabulary-basic-settings`. On load it drops unknown keys, including a stray `analytics` key, and writes the cleaned object back. Analytics IDs are repo config, not settings.

## Quiz

The quiz is a separate flow beside 看單詞 and 翻卡. The setup screen edits `session.quiz` (lessons, count, modes, random, lives, time) through the `quiz.*` setup commands; `src/storage/quiz.js` persists that setup under `study-minna-no-nihongo-vocabulary-basic-quiz` (the word/card settings schema and its migration stay untouched).

`src/study/quiz/modes.js` holds the 25 mode ids/labels and the pool-resolution rule. `src/study/quiz/setup.js` is the pure setup schema (defaults, normalization, patch validation; removed ids such as `kana`/`tower` are dropped from a stored mode list while the still-valid ids are kept). `src/study/quiz/faces.js` derives the three faces — 日語, 中文, 平假名 — from a word body using `src/dict/ruby.js`; no reading is invented and 圖片 is never produced because every `image` is `null`. `src/study/quiz/eligibility.js` derives each mode's setup availability from the user's actually-selected lessons. `src/study/quiz/engine.js` is the shared round engine: `buildQuizRun` shuffles and batches the chosen words (≤10 per round), `beginNext` starts a 3×3 draw under 隨機模式 or the next eligible ordered mode, `createRound` builds one mode's state, and `act` dispatches a tap/choose/act/confirm/next/resolve/timeout/end action and returns a `{ life, score, clock, message }` delta. The nine original modes live inline in `engine.js`; the sixteen newer modes live in `src/study/quiz/games/game-*.js` (one module each, exporting `create` / `act` / `eligible`), merged through `src/study/quiz/games/index.js` so the engine never grows a giant switch.

`src/commands/quiz.js` is the dispatch layer: setup edits, `quiz.start`, the in-round actions (including the generic `quiz.act` for the newer games), and `quiz.nextRound`. It applies the engine's deltas to the session (lives, score, countdown key) and decides when the run reaches `done` or `over`. It also owns the 10s hint clock's lifecycle: after every action and round start it recomputes `round.hint` from `src/study/quiz/hint.js` (`hintRule`), and it exposes `quiz.hintReady` / `quiz.hint`; `quiz.hint` calls `applyHint` to store `round.hintEffect` for the active mode's view. `src/views/QuizPlayView.vue` is now only the host: header, countdown, the 3×3 draw reveal, the round/done/over shells, the 提示 button, and the shared presentation timers; it resolves the active mode to a component in `src/views/games/` (one `game-*.vue` per mode, `src/views/games/index.js` maps ids to components). The host still owns the countdown timer, the brief correct-answer pause, the ~3s 翻卡配對 opening peek plus ~1s mismatch hold, the 消除下落 drop-in / post-clear resolves, the ~0.7s 路徑連接 path hold, and the 10s hint timer (a 200ms accumulation that dispatches `quiz.hintReady` after continuous actionable time) — all finished through dispatch. The 記憶順序 pile-tap deal, 2s countdown, and slot-check timers live in `game-memory.vue`, which drives the phases through `quiz.tap` / `quiz.next` / `quiz.confirm`. Two small presentation helpers keep behaviour out of the `.vue`: `src/study/quiz/cell-font.js` picks a length-based font-size class for tight grid cells, and `src/study/quiz/connect-path.js` turns the engine's path indices into measured SVG points that realign on resize. Game board styles are global in `src/styles/quiz-games.css` (var() tokens only). Mode-specific render state is generated in the engine/game modules so the views stay thin; the views render no `正確`/`錯誤` feedback text, only visual cues and the reveal's `正確答案：…` line.

## Storage migration

The storage keys were renamed from the reference app's short names to the
collision-free names above, so both sites can live on the same GitHub Pages
origin. Chrome caps an IndexedDB database name at 64 ASCII bytes; every new
name is under that cap (`study-minna-no-nihongo-vocabulary-basic` is 39 bytes,
not 42).

| Old | New |
|---|---|
| `words-settings` | `study-minna-no-nihongo-vocabulary-basic-settings` (48) |
| `words-theme` | `study-minna-no-nihongo-vocabulary-basic-theme` (45) |
| `words-dict` (IndexedDB, store `lists`) | `study-minna-no-nihongo-vocabulary-basic-dict` (44) |

localStorage (`src/storage/settings.js`, `src/storage/theme.js`): on `load()`, if
the new key is missing and the legacy key exists, the legacy value is copied to
the new key and the old key is removed. If both exist, the new value is kept and
the old key is dropped. `save()` writes only the new key, then tries to delete a
leftover legacy key (a failed delete does not fail the save). A thrown read or
write leaves the legacy key in place.

IndexedDB (`src/storage/idb.js`): on first `open()`, if a legacy `words-dict`
database exists, every record in the `lists` object store is copied into the new
database when the new store is empty. If the new store already has data, it is
kept. After a successful copy — or when the new database already has data, or
the legacy database was empty — the legacy database is deleted. If the copy
fails and the new store is still empty while the legacy store had records, the
old database is left for a later retry. Test databases with custom names do not
auto-migrate. Legacy names are exported as `LEGACY_*` constants
(`LEGACY_SETTINGS_KEY`, `LEGACY_THEME_KEY`, `LEGACY_IDB_NAME`).

## Analytics (T9)

| Layer | Responsibility |
|---|---|
| Config | `src/config/analytics.js`: `GTM_ID` and `GA4_ID`, both `''` |
| Pure rules | `src/analytics/page-view.js`: ID check, titles, `#/<screen>` location, payload |
| Adapter | `src/analytics/gtm.js`: load a script only for an enabled ID |
| Entry | `src/main.js`: read the config once, watch `session.screen` |

Behavior, titles, and the empty-ID rule: [`spec.md`](spec.md) → Analytics. T1–T8 do not add these files.

## Directory search

`src/dict/romaji.js` converts a Latin query to kana. `src/dict/labels.js` maps `speech` and `tags` ids to the Chinese labels in the data contract. `src/study/toc.js` is a pure filter over the frozen run: `kanji` substring, `japanese` substring, lesson number. The view paints the matched slice of the display word with `var(--error)`. The query is `session.tocQuery`.

## 字形對照 details

`src/dict/glyph.js` is the pure row mapping: `glyphRow` turns one `kanji_note.details[]` entry into the three cells `簡` `繁` `日`, using `opencc-js/t2cn` with `tw` → `cn` for the Simplified cell. `src/commands/glyph.js` exposes `glyph.open` (record the clicked pair and switch to the `glyph` screen) and `glyph.play` (bump `glyphPlayCount`). `src/study/glyph-strokes.js` loads a KanjiVG vector through the vendored kaki-jun library, recolours it to `--ink` / `--muted`, and returns a `play()` controller; a missing glyph or fetch failure returns `null` so the view shows `無筆順資料`. The kaki-jun library is not published on npm, so its two used modules are checked in under `src/vendor/kaki-jun/` with attribution in `NOTICE.md`; stroke data is fetched from KanjiVG at run time, never bundled.
