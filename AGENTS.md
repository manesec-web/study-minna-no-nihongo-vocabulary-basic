# AGENTS.md — execution plan (revision 2)

**Product:** a static Vue 3 site for memorizing Japanese words. It is the companion of `/project/game-japanese-katsuyou-basic` (verb conjugation). **Status:** T1–T9 and the post-T9 follow-ups (clickable 字形對照 detail page, home copy, storage migration) are delivered — see `docs/progress.md`.

**Behavior authority:** `docs/spec.md`. Read the matching section before building a piece. If the spec does not cover a product behavior, stop and ask. Do not invent a rule, and do not import a rule from the conjugation spec to fill the silence. Colour authority: `docs/theme.md`. Word files: `docs/data-contract.md`.

The word list is `vol/lesson_1.json` … `vol/lesson_50.json`, plus `vol/schema.json`. Do not edit those files. Do not copy `/project/game-japanese-katsuyou-basic/vol/`. Do not read `vol/.pi/` into the app.

## How to work

1. Do one task from the board in `docs/roadmap.md`. Finish its checks before the next task.
2. The view is thin. `.vue` files hold template and style only. Behavior lives in `.js`. A Vue file calls commands and renders state.
3. Every user-visible action is a command with `id`, `params`, `enabled`, `run`. The view and the tests call the same `dispatch(session, id, params)`. When `enabled` is false, `dispatch` returns `error` and does not call `run`.
4. A command returns `{ ok: true, result }` or `{ ok: false, error }`. Bad params, an empty library, and a hash mismatch return `error`. That path must not throw an uncaught exception.
5. Leave the conjugation repository unchanged. Read it. Do not edit it, and do not add a package dependency on it.
6. Do not add MCP, a backend, or a model call inside the site. Google Tag is T9, and only T9. Ship `GTM_ID` and `GA4_ID` as empty strings. An empty ID loads no script. Do not copy the conjugation site's IDs, and do not invent IDs.
7. Do not add a 學習 button, a 字典 button, a 翻卡練習 label, a 變形說明 screen, or a 15-form reader. The 測驗 button opens a blank page. Do not add a keyboard, an input, grading, or quiz settings.
8. When you finish a task, update `docs/progress.md` and the status cell in `docs/roadmap.md`. Say which commands you ran and which checks you could not run.

## Product decisions already made

- Home buttons, top to bottom: `單詞`, `練習`, `測驗`. `單詞` and `練習` open the picker (`words`, `card`). `測驗` opens a blank `quiz` page and returns home.
- `單詞` browses one entry at a time. The display word is `kanji`, or `japanese` when `kanji` is `null`. `練習` is flashcards. Direction defaults are in `docs/spec.md`. `測驗` has no interaction beyond back.
- The brand is blue, light and dark. Tokens are fixed in `docs/theme.md`. The conjugation indigo/amber palette is not a starting point.
- Storage on the shared GitHub Pages origin must not collide with the other app: localStorage `study-minna-no-nihongo-vocabulary-basic-settings` and `study-minna-no-nihongo-vocabulary-basic-theme`, IndexedDB `study-minna-no-nihongo-vocabulary-basic-dict`. The older `words-settings` / `words-theme` / `words-dict` keys are migrated on first read/open (legacy names are exported as `LEGACY_*` constants); exact rules: `docs/architecture.md` → Storage migration.
- Boot hashes 50 lessons and downloads `dict/vol.bin`. Counts and fields are in `docs/data-contract.md`.
- Product name and document title: `大家の單詞`. The large head is `大家の日本語`, then the accent line `單詞練習`, then `涵蓋初級 1 – 50 課的單詞`. Pages base `/study-minna-no-nihongo-vocabulary-basic/`. Planned repo `manesec-web/study-minna-no-nihongo-vocabulary-basic`.
- Google Tag stays empty through the build. T9 adds the hook. Filling the IDs waits until the user pastes them.

## Read, then leave out

Read `/project/game-japanese-katsuyou-basic` for the engine, paging, ruby, romaji, boot, scrollbar, theme-switch, and (at T9 only) the analytics page-view structure. The table in `docs/architecture.md` names the files. Leave out its 學習 flow, audio pipeline, analytics ID constants, its `vol/` shape, logo, and `app.css` colour values. Leave out its quiz keyboard.

## Tasks

Acceptance text is the board in `docs/roadmap.md`. Implementation notes:

### T1 Engine skeleton

Create `package.json`, Vite, Vue, Vitest, `index.html`, `src/main.js`, `src/engine/registry.js`, `src/engine/session.js`, and a mount that renders the document title. `dispatch` of an unknown id returns `{ ok: false, error.code: 'unknown-command' }` and the test asserts that. `vite.config.js` sets `base` to `/study-minna-no-nihongo-vocabulary-basic/` and `outDir` to `output`. Add `.gitignore` from `docs/development.md`. No screen logic yet beyond a shell that boots.

### T2 Manifest and boot

Add `scripts/write-sha256.mjs`, `src/data/vol-manifest.json` for the 50 lesson files, and the archive packer. Wire `app.boot` to `docs/data-contract.md`. Tests use `fake-indexeddb` and in-memory ZIP bytes. `--check` fails on a tampered manifest or a lesson that breaks the contract. Do not edit `vol/`.

### T3 Loading, home, blue theme

Implement Loading and Home from `docs/spec.md`, the tokens from `docs/theme.md`, and `theme.toggle`. About copy uses this site's GitHub URLs. The 測驗 button opens the blank quiz page. Add a test that fails if `src/views` or `src/components` contain a colour literal. Browser-check: the home screen has exactly three primary buttons, their labels are 單詞, 練習, 測驗, and the strings 學習 and 翻卡練習 are absent. The quiz body has no input and no key.

### T4 Picker

Per-mode lesson numbers for `words` and `card` only. Direction chips only for `card`, default `jp-zh`. `開始` labels match the spec table. `lessons.toggle` on an empty lesson returns `lesson-empty`. The shipped lessons are all non-empty. `quiz` never opens this screen.

### T5 Word reader

One block per entry, including `note`, `字形對照`, speech and tag labels, and 20 sentences when 顯示例句 is on. `image` is not drawn. `word.next` clamps. Ruby and romaji are pure modules with the tests named in the spec. Settings round-trip through `study-minna-no-nihongo-vocabulary-basic-settings`. The reader template has no control whose label is `變形原理`.

### T6 Cards

Direction changes the face and the question line. `card.next` sets `flipped` to false. Completion copy matches the spec, including the card-mode emoji set and the absence of a score.

### T7 Blank quiz page

Do not build the quiz module. The page from T3 stays blank: back, title `測驗`, empty body. A test asserts the quiz view contains no `input`, no `.quiz-key`, and none of the commands `quiz.input`, `quiz.submit`, `quiz.advance`. Browser: 測驗 opens that page, and back returns home.

### T8 Motion and empty-list build

Reduced-motion CSS is in place. `npm test` and `npm run build` pass offline. `output/dict/vol.bin` has 50 entries and `schema.json` is not one of them. `node scripts/browser-check.mjs` covers the paths added in T3–T7, including the blank quiz page. This task does not add `src/analytics/` or `src/config/analytics.js`.

### T9 Analytics hook

Do this last, after T8 is green. Add `src/config/analytics.js`, `src/analytics/page-view.js`, and `src/analytics/gtm.js` as `docs/spec.md` → Analytics describes. `src/main.js` watches `session.screen`. Tests prove that `''` injects no script, and that a test-only ID emits the page-view payload. Before finishing, both exported IDs are `''` again. Do not paste a real container or measurement ID.

## Stop and ask

- The spec does not describe the behavior.
- A word file needs a field that `docs/data-contract.md` does not list.
- A check fails because the real word list arrived mid-task. Land the files through the manifest script, then continue. Do not bend a screen to fit a surprise shape.
- You are about to edit `vol/`, add audio, a logo, 學習, a conjugation form, or a quiz keyboard.
- You are about to write a `GTM-` or `G-` id into `src/config/analytics.js`. Leave the strings empty unless the user has supplied the values in this conversation.

## Delivered follow-ups (post-T9)

The board (T1–T9) is complete. After it, three follow-ups landed:

- **字形對照 details page.** Every 字形對照 comparison row in the reader is a clickable button that opens a `字形對照` page (back to the reader at the same word). The table columns are exactly 簡 | 繁 | 日: 繁/日 come from the clicked pair's `zh`/`jp`, and 簡 is produced by opencc-js (`t2cn`, `{ from: 'tw', to: 'cn' }`) — no hand-written mappings. Same-code pairs render all three cells; `zh: null` (kokuji / wasei) leaves 簡/繁 empty (`—`) and shows only 日. A `播放筆順` button sits below the table (Traditional left, Japanese right) and replays stroke-order animation via the vendored `code4fukui/kaki-jun` library (`src/vendor/kaki-jun/`, see its `NOTICE.md`), which fetches KanjiVG at run time; a missing glyph or a network failure shows 無筆順資料 on that side only, and reduced motion shows the completed glyph. Behavior lives in `.js` via dispatch: `src/dict/glyph.js`, `src/commands/glyph.js`, `src/study/glyph-strokes.js`, session `glyph` + `glyphPlayCount`. Dependency: `opencc-js@^1.4.2`.
- **Home copy + theme switch.** The home/loading head is 大家の日本語 / 單詞練習 / 涵蓋初級 1 – 50 課的單詞 (en-dash). The theme switch sits on the subtitle row, to the right of 單詞練習 (`SiteHead` `#aside` / `.home-theme` on `.site-subtitle-row`), not beside the main title. Document title / product name / analytics `SITE_TITLE` remain 大家の單詞.
- **Storage migration.** The storage keys were renamed to the collision-free names above (all under Chrome's 64-ASCII-byte IndexedDB cap): `words-settings` → `study-minna-no-nihongo-vocabulary-basic-settings` (48), `words-theme` → `study-minna-no-nihongo-vocabulary-basic-theme` (45), `words-dict` → `study-minna-no-nihongo-vocabulary-basic-dict` (44). See `docs/architecture.md` → Storage migration for the exact copy/delete rules.

`vol/` is unchanged, and `GTM_ID` / `GA4_ID` remain `''`.
