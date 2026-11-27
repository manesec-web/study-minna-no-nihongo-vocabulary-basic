# Roadmap

Revision 2, 2026-11-23 (board complete). Behavior: [`spec.md`](spec.md). Execution: [`AGENTS.md`](../AGENTS.md). Status: [`progress.md`](progress.md). The product name is `大家の單詞`. The word list is `vol/`.

## Ground rules

- Read the matching `docs/spec.md` section before writing a piece. If the spec is silent, stop and ask.
- One task at a time, in order. Finish its checks before the next task.
- `.vue` files hold template and style only. Behavior lives in `.js`.
- Every user-visible action is a command. Views and tests call `dispatch`.
- A command returns `{ ok: true, result }` or `{ ok: false, error }`. Bad params, an empty library, and a hash mismatch do not throw.
- Do not edit `vol/lesson_*.json` or `vol/schema.json`. Do not copy the conjugation `vol/` tree. The quiz is now built (see spec.md → Quiz); do not add a keyboard.
- No MCP, no backend, no model call inside the site.
- Colours come from [`theme.md`](theme.md).
- Do not add 學習, 字典, or 翻卡練習 as home labels.

## Task board

| # | Status | Done when |
|---|---|---|
| 0 Docs | done | This pack is in the repo |
| T1 Engine skeleton | done | `npm test` covers unknown-command → `ok: false`. `npm run build` writes `output/`. `output/` is gitignored. No business rules in `.vue` |
| T2 Manifest and boot | done | `vol-manifest.json` lists 50 lessons. `--check` fails on a tampered hash and passes when restored. Fixture tests cover a hash match, a missing file, one retry, and a second mismatch that sets `boot.error`. `vol/` bytes stay unchanged |
| T3 Loading, home, blue theme | done | Document title reads `大家の單詞`; the large head reads `大家の日本語` / `單詞練習` / `涵蓋初級 1 – 50 課的單詞`, with the theme switch on the subtitle row to the right of 單詞練習. Three home buttons, no 學習 button, About links, theme switch stores `study-minna-no-nihongo-vocabulary-basic-theme`. 測驗 opens a blank page. A scan finds no colour literal outside `app.css`. Browser: loading, three buttons, both themes, blank quiz |
| T4 Picker | done | Chips are `第1課`–`第50課`. An empty lesson is inert and 全選 skips it. Direction exists only on `card` and is remembered. 開始 stays disabled until a lesson is selected. Browser: 單詞 and 練習 open the picker; 測驗 does not |
| T5 Word reader | done | Display word follows `kanji` / `japanese`. Ruby tests, `字形對照`, speech and tag labels, 20 sentences, swipe clamps, settings survive reload, directory search including one romaji query. No image slot and no 變形原理 control. Browser: swipe or footer moves to the next word |
| T6 Cards | done | Face and back follow the direction. Flip, then a next card, opens face-up. First card does not drag backward. Last card's 完成 opens the completion panel. Browser: tap reveals, forward control advances |
| T7 Blank quiz page | done | Body stays empty. No input, no `.quiz-key`, no quiz commands. Browser: 測驗 opens the page and back returns home |
| T8 Motion and archive build | done | Reduced motion keeps the gradient still and fades screen changes. `npm test` and `npm run build` succeed offline. `output/index.html` exists. `output/dict/vol.bin` has 50 lesson entries and no `schema.json`. No Google script in the bundle |
| T9 Analytics hook | done | Last task. `GTM_ID` and `GA4_ID` are `''`. Empty IDs add no `gtm.js` and no `gtag/js`. A test with a temporary non-empty ID pushes one `page_view` per later screen and skips `loading` and the first `home`. The committed config is empty again before the task ends |

Order: T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9. Do not start T9 before T8. Do not start a backlog item by porting it. Do not paste an ID the user has not supplied.

Follow-ups (post-T9, 2026-11-25): the word reader's 字形對照 rows are now clickable buttons that open a new `字形對照` detail page — a 簡 繁 日 table (opencc-js for 簡) and a `播放筆順` stroke-order animation via the vendored `code4fukui/kaki-jun` library; the home/loading head reads 大家の日本語 / 單詞練習 / 涵蓋初級 1 – 50 課的單詞 with the theme switch on the subtitle row; and the storage keys were renamed from `words-*` to `study-minna-no-nihongo-vocabulary-basic-*` with a one-time migration in the adapters. A later follow-up (2026-11-26) turns 隨機模式's draw into a 3×3 grid of nine cards with the demo-style fly-and-flip reveal. A 2026-11-27 follow-up reworks 翻卡配對/消除下落/路徑連接/記憶順序/拼字, removes 假名重組 and 卡片塔, and leaves 9 concrete modes; a second 2026-11-27 pass fixes the browser-level regressions in pairs/match3/connect/boss/reaction; a third 2026-11-27 pass adds ten new modes (19 total) and the one-game-per-component host; a fourth 2026-11-27 pass adds eight more modes (27 total); a fifth 2026-11-27 pass reworks 翻卡配對's deal peek, 消除下落's 10-group win and drop/gravity motion, 路徑連接's 6×9 board, and 記憶順序's poker-table intro; and a sixth 2026-11-27 pass redesigns those four modes again — 翻卡配對 fixed 4×5 with a 3s peek bar, 消除下落 random reshuffle + random plant (no fixed top-left stamp), 路徑連接 8×5 (40 cells), and 記憶順序 pile → deal-into-slots → 2s countdown → place-then-check. A seventh 2026-11-27 pass removes 三元消消樂 and 振假名狙擊 (25 concrete modes), reworks 打地鼠 to one mole at a time on a 1s-up/2s-down cycle, and re-renders 單字麻將 as a 羊了個羊-style layered 3D stack. An eighth 2026-11-27 pass adds the 10s `提示` button to all 25 concrete modes, with per-mode highlights/reveals driven by `quiz.hint`. A ninth 2026-11-27 pass fixes 去漢字盲測's blank board from the second question on, enlarges 單字麻將 into a 54-tile 羊了個羊-style pyramid with a provable sweep order, makes 濁音排雷 10 questions per round, and rebuilds 單字貪食蛇 on a fine mostly-empty 13×17 grid with a reserved winning walk and 1s wrong-kana re-placement. A tenth 2026-11-27 pass removes 音拍猜謎 (24 concrete modes) and puts 單字麻將's pile and 7-slot tray inside one visible non-overflowing frame. An eleventh 2026-11-27 pass gives 單字麻將 solid tiles with a frost veil on covered ones, makes the Boss 戰 / 選擇題 marks icon-only without moving the label, turns 極速是非 into ⭕/❌ buttons with a red wrong state and 0.5s / 3s advance, lists 找出內鬼 one per row, and shrinks the 猜假名 / 五十音劊子手 pads to 6×6. These are specified in `spec.md` and recorded in `progress.md` / `changelog.md`, not on this board.

## Backlog

These need a spec change before any code:

- B1 Recordings for `word` and for `sentences[].japanese`.
- B2 A logo under `docs/logo/`, then icon links in `index.html`.
- B3 Paste `GTM_ID` and `GA4_ID` into `src/config/analytics.js` only after the user supplies them. T9 leaves both empty. Do not reuse the conjugation container.
- B4 Quiz interaction: delivered 2026-11-25 — quiz setup + round engine + 25 tap-driven modes, grading, lives, countdown, and completion (see spec.md → Quiz). A kana keyboard stays out of scope.
- B5 Draw `image` if a later revision stores a real path instead of `null`.
