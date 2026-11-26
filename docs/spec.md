# Product spec

Revision 2, 2026-11-23, amended 2026-11-25 (reader: no hairline under the tags, 例句 before 字形對照, five random example sentences, redesigned 字形對照; card setting 只顯示平假名; clickable 字形對照 detail page; home head copy; storage key migration). This file is the behavior authority. The app is built; T1–T9 and the follow-ups are delivered. The word list is in `vol/`: [`data-contract.md`](data-contract.md). Colour values live in [`theme.md`](theme.md). If a behavior is not here, stop and ask. Do not fill the gap from the conjugation app.

A single-page site for memorizing Japanese vocabulary. The product name is `大家の單詞`. Phones come first. On a computer the content column stays in the center. The head copy below is the product copy.

There are no wireframes. Do not copy `docs/screenshot-draft/` from the conjugation repo, and do not draw annotation boxes around the phone.

## Mapping

| This site | Reference interaction | Difference |
|---|---|---|
| 單詞 (`words`) | 字典 | One block per word. No 15 forms, no 變形原理, no 錯誤單詞 |
| 練習 (`card`) | 翻卡練習 | Face/back are the word and its gloss, in a chosen direction |
| 測驗 (`quiz` / `quiz-play`) | — | A setup screen (`quiz`) and a round-based quiz with 27 modes (`quiz-play`). Tap-driven; no keyboard |
| — | 學習 / 變形說明 / 選字 | Not in this site |

## Screens

State machine: `loading` → `home` → `picker` → (`reader` | `card`). `home` also opens `quiz` (quiz setup), which starts `quiz-play` and returns to `home`. `reader` opens `toc` and `glyph` and returns to the same word. `reader` and `card` open `settings` and return to the same item. `quiz` and `quiz-play` do not open `settings`. A reload starts at `loading` again.

The column is `min(100%, 480px)`, centered. At viewport widths of 550px or less the column is full-bleed: no side margins, radius, or shadow, and the gradient and grain are dropped so the column colour is the whole page. Above 550px the column keeps its frame.

Screen ids: `loading`, `home`, `picker`, `reader`, `toc`, `glyph`, `card`, `quiz`, `quiz-play`, `settings`. There is no `learn`, `rule`, or `example` screen. `picker` and `settings` read `session.mode`: `words` or `card`. `quiz` and `quiz-play` have no study mode.

### Theme

Only `home` shows the theme switch: 8px to the right of the 習 that ends the head's `單詞練習` line, vertically centered on that line. The head's subtitle row is a `1fr auto 1fr` grid, so the switch starts where the subtitle ends and the subtitle stays centered. It is a 36px round icon button. It draws `Moon` while the light theme is on and `Sun` while the dark theme is on. The accessible name is `切換為深色模式` or `切換為淺色模式`, matching the theme the press will turn on. `aria-pressed` is true in dark. The same string is the hover tooltip.

The site follows `prefers-color-scheme` until a press stores `light` or `dark` under localStorage key `study-minna-no-nihongo-vocabulary-basic-theme`. The CSS media query paints the OS theme on the first frame. A stored choice wins over the OS, including after reload, and an OS change while the page is open no longer repaints it. Nothing is written when the OS alone decided. An unrecognized stored value is ignored. No other screen shows the switch.

Colours: [`theme.md`](theme.md). No screen writes a literal colour.

### Loading

The loading screen opens on a square 1:1 logo icon (`src/assets/logo.jpg`, the site artwork copied from `docs/img/logo.jpg`) instead of the three-line head. Under it a circular arc spinner spins — a resting ring in the track colour with a sweeping accent-coloured arc — with no `Loading ...` line and no linear bar; the spinner is `role="status"` and labelled `載入中`. Under `prefers-reduced-motion: reduce` the arc holds still instead of spinning. The footer is `Build with ❤ by Mane` alone and opens the About sheet. The icon and the footer stay on screen while boot runs and while a failure offers retry; the spinner is swapped for the error text and 重試 button on failure. The loading screen has no theme switch.

A failure names the file, for example `載入失敗（lesson_2.json）`, prints the underlying reason under it, and offers a retry that runs `app.boot` again. An empty manifest is success, not a failure: boot finishes and the screen goes to `home`.

### Home

The head is three lines above the entries: the large title `大家の日本語`, the medium subtitle `單詞練習` under it, and the line `涵蓋初級 1 – 50 課的單詞` under that. The theme switch sits on the subtitle line. Three large buttons, stacked, in this order, with these exact labels:

1. `單詞` — `nav.go` to `picker` with mode `words`
2. `練習` — `nav.go` to `picker` with mode `card`
3. `測驗` — `nav.go` to `quiz`. It does not open the picker.

There is no fourth button. The labels `學習`, `字典`, and `翻卡練習` do not appear. Each button is 60px tall.

The footer has two lines, `🥺 如果有 BUG 記得告訴我！` and `Build with ❤ by Mane`. Both open one About sheet:

- `本項目已經開源，` + link + `可以獲得源代碼。` The link is `https://github.com/manesec-web/study-minna-no-nihongo-vocabulary-basic` and opens in a new tab.
- `意見 & Bug 反饋：` then an ordered list: `提交ISSUE` opens `https://github.com/manesec-web/study-minna-no-nihongo-vocabulary-basic/issues/` in a new tab, and `或者發送郵件到` + a `mailto:` link whose text is `mane@manesec.com`.
- `🥺 どうもありがとうございます。` The control `關閉` closes the sheet.

### Lesson picker

`words` and `card` only. Back returns to `home`. The title is `詞彙`. On the right, `全選` selects every lesson whose `vols` array is non-empty when any of those is unselected, and clears them when they are already all selected. The label is `全選` until that set is fully selected, then `取消全選`.

Chips are `第1課` through `第50課`, in lesson order. Three looks: has entries and not selected — outline; has entries and selected — filled; `vols` is empty — grey, the button does nothing, hover tooltip `該課沒有單詞`. A disabled button does not take keyboard focus. In the shipped files every lesson has entries, so every chip is selectable. The grey state stays for a file that is later emptied.

`words` mode ends there. `card` mode adds a `方向` block under the chips: a single choice of two chips. `quiz` has no direction and no picker.

| id | Label | Default |
|---|---|---|
| `jp-zh` | `看日文，答中文` | `card` |
| `zh-jp` | `看中文，答日文` | — |

One direction is always selected, so the block cannot be empty. The choice is stored for `card` only. It is not on the settings screen. Changing it means leaving the run and starting again.

`開始` sits in the footer. It is disabled, with red text and a red 1px border on a transparent background, in these cases, and the label is the message itself:

| Condition | Label |
|---|---|
| Manifest has no lessons | `單詞列表尚未放入` |
| No lesson selected | `請至少選擇一門課程才可以開始` |
| Otherwise | `開始` |

An empty lesson cannot be selected, so a press of `開始` always has at least one entry. `study.start` builds the run and opens `reader` or `card` to match the mode. The reader list is the selected lessons in order, and inside a lesson the `vols` order. The card list is those same entries, shuffled once at start. Each of `words` and `card` remembers its own lesson numbers under `study-minna-no-nihongo-vocabulary-basic-settings`.

### Word reader

Top bar, pinned: back (to the picker), the title `單詞`, a `目錄` button (`List`), then a settings gear (`Settings`). The body is one entry, top to bottom:

- The display word, centered. When 顯示平假名注音 is on and `kanji` is a string, ruby follows Readings. When the switch is off, or `kanji` is `null`, the display word is drawn with no ruby.
- `chinese`, centered, printed exactly as stored.
- One centered row of pills: `第N課`, then the speech label from [`data-contract.md`](data-contract.md), then each tag label. Drawn once.
- `note`, when it is a string, left-aligned, in `--note`.
- When 顯示例句 is on: a `例句：` label, then a random sample of 5 sentences from that entry, or every sentence when the entry has fewer than 5. The sample is a pure function of `session.runSeed` (drawn in `study.start`) and the entry's lesson and index, so paging away and back, or opening settings or 單詞目錄, does not reshuffle. A new 開始 draws a new seed. The five sentences stay in dictionary order. Do not invent sentences and do not edit `vol/`. Japanese line then Chinese line. Inside the Japanese line, every exact occurrence of the display word is painted `--highlight`. The sentence text is not rewritten. The Chinese line is plain.
- `字形對照`, only when `kanji_note` is an object, after the 例句 block (or after `note` / the pills when that block is hidden or empty). The heading is `字形對照`, left-aligned. The `summary`, every comparison row, and any `note` under a pair stay centered in the reader column. Under the heading, `summary` as written, in muted text so it does not compete with the pairs, then one comparison row per `details` item, stacked in a single centered column. Each row shows the `zh` glyph with the caption `繁` (`lang="zh-Hant"`, `Noto Sans TC` first), then an arrow, then the `jp` glyph with the caption `日` (`lang="ja"`, Japanese fonts from the system stack first) when `zh` is a string. When `zh` is `null`, the row shows only the Japanese side; do not invent a Chinese stand-in. When `note` is a string, it is printed under that pair in `--note`, also centered. Glyph strings are printed exactly as stored. Do not rewrite 台 as 臺. The heading is not stored in the data and is not repeated inside `summary`. Every comparison row is a button: it is keyboard-focusable, looks interactive, and a press opens that pair's 字形對照 details page (below).

`image` is not drawn. There is no hairline under the tag row. Later blocks — `note`, the 例句 block, and 字形對照 — are separated from each other by a hairline. No tinted panel. A word opens at the top of the page.

Paging: see Motion. At 550px or less, swipe right-to-left for the next word and left-to-right for the previous. The strip tracks the finger 1:1, clamped to one word, and the neighbor peeks in. The first word does not move backward and the last word does not move forward, at any distance. A release past 72px changes the word; a shorter drag settles back. Vertical movement stays page scroll. Above 550px a drag selects text and only the footer changes the word.

The footer is pinned: `上一個` and `下一個`, 50px, disabled at the ends. There is no completion screen. The window keeps 5 words mounted, current item in the 3rd slot.

A tap on a word or a sentence does nothing; a tap on a 字形對照 comparison row opens its details page. There is no audio.

### 字形對照 details

Opened by a press on a 字形對照 comparison row in the word reader. Back returns to the reader at the same word. The title is `字形對照`. No gear and no directory.

The body, top to bottom:

- A table with exactly three columns, `簡`, `繁`, `日`. `繁` is the pair's `zh` and `日` is the pair's `jp`, both printed exactly as stored. `簡` is produced with opencc-js, Traditional Chinese to Simplified Chinese, using the Taiwan-to-Mainland config (`tw` → `cn`); mappings are never typed by hand. Same-code pairs such as `漢` / `漢` still show all three cells. When `zh` is `null` (和製字 / kokuji), the `簡` and `繁` cells are empty (`—`) and only `日` shows the Japanese character; no Traditional or Simplified stand-in is invented. The `簡` cell is `lang="zh-Hans"`, `繁` is `lang="zh-Hant"`, `日` is `lang="ja"`.
- The pair's `note`, when it is a string, centered in `--note`.
- A `播放筆順` primary button. Pressing it replays the stroke-order animation.
- Two stroke panels side by side: Traditional Chinese (`繁`) on the left and Japanese (`日`) on the right. Stroke data comes from the kaki-jun library (`code4fukui/kaki-jun`), which fetches KanjiVG vectors at run time; the site does not bundle or invent stroke data. The fetched drawing is recoloured to `--ink` (stroke) and `--muted` (stroke numbers), so it stays visible in the dark theme. When a side has no KanjiVG data — including a Traditional form KanjiVG does not carry, or a network failure — that panel shows `無筆順資料` and the other side and the rest of the page keep working. Under `prefers-reduced-motion: reduce`, `播放筆順` shows the completed glyph instead of the per-stroke reveal.

### 單詞目錄

Opened from `目錄`. It lists the frozen reader run, so it does not re-read settings when it opens.

- Top: back (to the reader, same word), title `單詞目錄`, a `搜尋` button (`Search`). No gear.
- The search box pins under the bar: 44px, placeholder `搜尋單詞、讀音或課號`, clear button `X`.
- A row matches when the query is a substring of `kanji` (when it is a string), of `japanese`, or of the lesson number. A Latin query is Hepburn romaji and is converted to kana before the `japanese` match, including macrons (`kyō` / `kyou`), the small つ (`itta`), and katakana readings matched as hiragana. The matched slice of the display word is painted `--error`. A lesson-number match paints nothing. A lesson whose rows all fail leaves no heading. No match: one muted line, `沒有符合的單詞`.
- Clearing or closing the box restores the full list. Leaving the screen discards the query. The query does not change the reader's current word.
- Groups follow lesson order. A heading is `第N課`. Each row is one entry: the display word on the left, no reading, no speech tag. Rows are 44px outlined buttons, 8px apart. The current entry is `aria-current="true"` and its label uses `--accent`. Opening the list scrolls that row into view.
- A press runs `word.goto` for that entry's index and returns to the reader.

Card and quiz do not open this screen. The quiz page has no list.

### Word settings

Back returns to the reader and keeps the current word.

- `顯示平假名注音` — switch, default on.
- `顯示例句` — switch, default on. Off hides the `例句：` block.

A separator between settings rows is its own 1px element in `--line`, not a border on the row. The first row has no rule above it. The last row has no rule under it.

### Cards

Title `練習（n/total）`, 1-based. The list order is the shuffle from `開始`.

Face, top to bottom:

- `jp-zh`: by default, the display word, with ruby only when `kanji` is a string and both 一開始顯示讀音 and 顯示平假名注音 are on; then the line `中文是什麼？`. When 只顯示平假名 is on, the face shows only hiragana: the entry's `japanese`, with katakana letters transcribed to hiragana. The long-vowel mark, punctuation, Latin, and any kanji already stored in `japanese` stay as written. No ruby. 一開始顯示讀音 has no effect. If `japanese` is empty, the display word is transcribed the same way; a reading is never invented.
- `zh-jp`: `chinese`; then the line `日文是什麼？`. 只顯示平假名 does not change this face.

A tap runs `card.flip`. The turn is a 3D `rotateY`, about 240ms, decelerating, not past 180°. The back shows the display word (ruby follows 顯示平假名注音 when `kanji` is a string), then `chinese`, then the speech pill and `第N課`. It does not show `note`, `字形對照`, or the example sentences. Another tap flips back to the face.

`上一張` / `下一張` walk the frozen order. A new card opens face-up. Paging matches the reader, including the 72px threshold and the 1:1 drag. The window keeps 9 cards mounted; only the current card can be turned; the others stay face-up. The right-hand control reads `下一張` until the last card, then `完成`. `完成`, or a forward swipe on the last card, ends the run and shows Completion. Arriving on the last card does not end the run. A backward drag on the first card moves nothing.

### Card settings

- `一開始顯示讀音` — switch, default on. Affects the `jp-zh` face only. When 只顯示平假名 is on, this switch is disabled: it looks unavailable, does not take keyboard focus, cannot be toggled, and has no effect on the face. Its stored value is kept and applies again when 只顯示平假名 is turned off.
- `只顯示平假名` — switch, default off. Affects the `jp-zh` face only. On, the question shows only hiragana as described under Cards.
- `顯示平假名注音` — switch, default on. Off removes ruby from the face and the back. The back still follows this switch when 只顯示平假名 is on.

### Quiz

Two screens: `quiz` is the setup screen, `quiz-play` is the round screen. The home `測驗` button opens `quiz`. Back on `quiz` returns to `home`; back on `quiz-play` also returns to `home`. Neither opens `settings` and neither has a study `mode`.

#### Quiz setup

Top bar, pinned: back (to `home`), title `測驗`. No gear. The body is four multi-select / single-choice blocks, then a sticky `開始`:

- `課次` — multi-select lesson chips `第1課`–`第50課` from the loaded dictionary, with a `全選` / `取消全選` control. An empty lesson is inert like the picker.
- `單詞數量` — single choice: `全部`, `100`, `50`, `30`, `10`.
- `模式` — multi-select: `隨機模式`, `選擇題`, `翻卡配對`, `消除下落`, `路徑連接`, `Boss 戰`, `記憶順序`, `拼字／打亂重組`, `快速反應`, `雙欄對決`.
- `生命` — single choice: `無限`, `10次`, `5次`, `3次`, `1次`.
- `時間` — single choice: `無限`, `10秒`, `5秒`, `3秒`.

`開始` is disabled, with red text and a red 1px border, until at least one lesson is selected; the disabled label is `請至少選擇一門課程才可以開始` (or `單詞列表尚未放入` when the dictionary has no lessons). A valid press runs `quiz.start` and opens `quiz-play`. The setup selections persist under localStorage `study-minna-no-nihongo-vocabulary-basic-quiz`; unknown fields are dropped on load.

#### Round structure

Each round uses at most 10 words. `單詞數量` selects how many of the chosen lessons' words the whole quiz uses: `全部` uses every selected word, otherwise the number is capped at that count. The chosen words are shuffled once, then batched into 10-word rounds; a remainder is a shorter final round.

- `隨機模式` is a lobby mechanic, not a question type. When on, each round starts with a 3×3 grid of nine face-down cards; tapping one reveals a concrete mode, which is then played with the next batch. The pool is the other checked concrete modes, or every concrete mode when none is checked. After the round, a fresh 3×3 draw appears until words run out.

Each draw round picks one card only. A tap is one continuous reveal: the chosen card flies from its grid slot to the centre and grows to about `min(68vw, 270px)` wide (3:4 tall) while its `.inner` flips `rotateY(0deg) → 90deg → 180deg`, the two motions starting at the same instant; the other eight cards dim and blur and stop accepting taps. The card holds at the centre for ~1.1s showing the drawn mode's label, then returns to its slot while the dim backdrop fades. The slot then stays face-up with a completed state, and only then does the command dispatch `quiz.tap` and open that mode's round. Under `prefers-reduced-motion: reduce` the flight and flip are skipped: the card flips in place and the mode opens.
- When `隨機模式` is off, the checked concrete modes play in their listed order, repeating until all batches are done. No checked mode means every concrete mode, in order.

Lives are session-wide. When they reach 0 the whole quiz ends, except where a mode's rule below says it only ends that mode (the mode then ends and the quiz continues with remaining lives). `生命: 無限` means lives never reach 0.

When `時間` is on, a countdown bar sits at the top of the round screen, draining from 100% to 0% with the same track/tokens as the reading progress bar. Per-mode rules below decide whether a timeout fails one item, ends the mode, and whether a correct action resets the bar.

#### Modes

1. `選擇題` — mixed prompt/answer faces (中文↔日語, 日語↔平假名, etc.), 5 choices. Correct: wait ~1s, next question (no 正確 text). Wrong or timeout: lose a life, show the correct answer, wait for `確定`.
2. `翻卡配對` — a 20-card matrix of 3D cards, 4 columns × 5 rows on mobile and 5 columns × 4 rows on desktop (a `max-width: 550px` breakpoint). Every card starts face-down with `?` visible and its text face hidden by `backface-visibility`; tapping flips it. Two open cards are one attempt. A match keeps both faces open and marks them paired. A mismatch keeps both faces open for ~1s (taps are ignored during the hold) so the player can read them, then the view dispatches `quiz.resolve` and they flip back to `?`. Pairs may mix 日語/中文/平假名 (the same word's two faces). A correct pair resets the countdown; timeout ends the mode immediately.
3. `消除下落` — 5×5 board of word faces that may repeat; select adjacent (4-neighbour) same-word cards, 3+ clears. The board always starts with, and is refilled to have, at least one real connected 3+ group by canonical word id (漢字/假名/中文 aliases of the same entry all share that id). A legal partial path (each step adjacent and same word) never costs a life. An illegal extension — a non-adjacent cell of the same word, or a neighbouring different word — costs a life. Tapping a different group's start (different word, non-adjacent) just re-selects. Cards above fall and the top refills. 4+ scores a bonus and consecutive clears combo. A clear resets the countdown; timeout ends the mode. A short hint line explains that 日文/中文/假名 of the same word all count. A `結束本模式` control ends the round early.
4. `路徑連接` — 6×6 board; each word appears an even number of times across 日語/中文/平假名. Tap two cards; same word plus a path of at most 2 turns through cleared cells clears them. Uncleared cards keep a visible surface and border (light and dark); cleared holes are transparent with no border. The board uses `repeat(6, minmax(0, 1fr))` and wraps long words so it never overflows the panel. The winning path is drawn with a measured SVG polyline that tracks cell centres after resize, held ~0.7s, faded out, then the pair clears (`quiz.resolve`); a wrong attempt (mismatch or blocked path) costs a life and both cards flash; a correct pair resets the countdown; timeout or lives 0 ends the mode. The opening board and every post-clear board keep at least one legal move; when none remains the remaining cards are reshuffled (cleared holes stay) until a move exists, or a rare unsolvable leftover is left in place.
5. `Boss 戰` — a boss HP bar, questions below (5-choice). Correct answers damage the boss (a streak of 3+ crits ×2) and reset the question countdown; wrong or timeout costs a life and shows `確定` but never raises HP. Every third question applies a fair `短時` modifier that trims the countdown by one second. Boss HP 0 is victory; lives 0 is defeat.
6. `記憶順序` — each group shows 3 cards (日語 or 平假名, mixed) for ~3s or until `記住了`, then covers them and shows 6 Chinese options: the 3 correct meanings plus distractors. Tapping a correct meaning solves it; all meanings solved scores the group and moves to the next 3 words. A wrong tap costs a life and reveals the next unsolved correct meaning, then `確定` retries the same group. The mode is untimed.
7. `拼字／打亂重組` — one scrambled word at a time; the kana is split and padded with random distractor kana to exactly 8 tiles (a word longer than 8 keeps all its characters with no distractors). Tap tiles to build the reading, tap a placed tile to take it back. Correct resets the countdown; wrong or timeout costs a life and shows the correct spelling before `確定`.
8. `快速反應` — all words in play, 6 cards on screen. The top prompt and the option cards always use different faces (e.g. prompt 中文, options 日語/平假名) so it is never a same-language match; the language is a small label and the big prompt is just the word (no leading `:`/`：` separator). Option texts are unique, so exactly one card is correct. Correct: card disappears, a new one fills in, combo +1, countdown resets, and any wrong-card flash is cleared. Wrong: lose a life, combo resets, the tapped card flashes, and the same board stays until a correct hit. All words hit clears the mode; lives 0 or timeout fails it.
9. `雙欄對決` — left column 中文/平假名, right column 日語/平假名, both shuffled. Click one left then one right to pair. Correct: both disappear, combo +1, countdown resets. Wrong: both flash, lose a life, combo resets. All paired clears; timeout ends the mode (paired items count).
10. `極速是非` — a central Japanese word + one Chinese meaning that is randomly a true or false pairing. Right swipe / `正確配對` and left swipe / `錯誤配對` judge it; a swipe and the buttons share the same resolved guard so one question fires once. A wrong pairing's Chinese must be a genuinely different canonical word. Wrong: lose a life and show the true/false reveal.
11. `找出內鬼` — four 日文＋中文 groups, exactly three correct and one mismatched. Tap the odd one out. It uses the session countdown when set, otherwise a fixed 15s per question. Wrong or timeout: lose a life and reveal the correct Chinese, then `確定`.
12. `缺字填空` — show a Chinese meaning plus a reading with one grapheme removed; choose the missing grapheme from exactly eight unique kana options. Unicode graphemes are split with `Array.from`; words with fewer than two kana are excluded.
13. `猜假名` — Wordle over a 4–5 kana reading with a Chinese hint (hidden until the third submitted guess in 高手模式). An on-screen kana pad and the physical keyboard are both supported; invalid length does not consume a guess, six guesses max, and repeated kana use the two-pass colour rule.
14. `迷你填字` — a real connected crossword generated from 4–6 selected words that share kana, with no conflicts, collinear overlap, or disconnected fake layouts. Tap a cell for its Chinese hint and fill it from the kana pad; `檢查完成` finishes it. Bounded backtracking; an insufficient pool is skipped with a reason.
15. `三元消消樂` — only words with a real kanji written form that differs from its kana reading qualify. Tap three cards (漢字/假名/中文) of the same canonical word to clear; an in-mode toggle switches to `看漢字選讀音` or `看讀音選漢字` eight-option picks.
16. `隕石防禦` — a falling Japanese meteor; fire the matching Chinese cannon. The view drives the fall (slower under reduced motion) and stops ticking on unmount. Wrong cannon or a landed meteor costs a life; a finite round ends when all words have fallen.
17. `打地鼠` — a Chinese target on top, nine holes pop up and vanish. Tap a correct mole to score, tap a wrong one to lose time; at least one correct mole is always visible. Session time is used when set, otherwise a fixed 60s.
18. `去漢字盲測` — the prompt is only the hiragana reading (katakana transcribed, never invented); pick the Chinese from five choices. Words without a reading are excluded.
19. `振假名狙擊` — show the kanji + Chinese meaning and pick the correct hiragana reading from eight unique options. Only words with both a kanji form and a reading qualify; distractors are never the same word's alias.
20. `單字麻將` — layered tiles of 漢字/假名/中文; only uncovered tiles can be tapped into a 7-slot tray, and three tiles of the same canonical word clear. The generator builds one three-high stack per word (provable removal order); the tray is checked for a triple before the 7-slot limit. Qualifies with ≥3 漢字/讀音/中文 words.
21. `濁音排雷` — kanji + Chinese prompt, four unique readings, one correct; distractors are micro-perturbations (voicing toggle, っ insert/delete, vowel change, ー) never another legitimate alias. Qualifies with ≥2 漢字/讀音/中文 words of ≥2 kana.
22. `迴轉壽司` — a kanji + Chinese plate moves right-to-left; type the reading (IME kana or a small romaji fallback, no new dependency) before it leaves. Only an exact normalised match consumes it; a missed plate costs a life. Fixed finite targets with a clear win/lose.
23. `找碴讀音` — six 漢字＋假名＋中文 cards, exactly one reading had a single kana changed; tap it before the timer. Qualifies with ≥6 eligible words.
24. `音拍猜謎` — show kanji + Chinese, pick the mora count using the real Japanese mora rules (small ゃゅょ combine, ん/っ/ー each count one). Qualifies with ≥1 漢字/讀音/中文 word.
25. `尋字迷宮` — a real 7×7 kana grid hiding five selected words (straight horizontal/vertical with non-conflicting crossings); Chinese-only clues, tap start then end. Qualifies with ≥5 distinct 2–7-kana words.
26. `單字貪食蛇` — a bounded grid; the snake eats the current word's kana in order while avoiding distractors, the wall, and itself. Direction input (WASD/arrows/d-pad/swipe) queues to prevent the fast-reversal self-collision. Qualifies with ≥1 2–6-kana word.
27. `五十音劊子手` — Chinese clue plus one underline per kana; a full gojuon keyboard (dakuten, handakuten, small kana, ー) reveals every occurrence on a hit, a wrong guess costs a life, and a repeat is free. The answer is normalised hiragana.

Every mode is playable through taps on rendered cards/tiles; there is no `quiz.input` / `quiz.submit` / `quiz.advance` command, and the only `<input>` belongs to 迴轉壽司 typing (IME/romaji). Quiz interaction commands are `quiz.tap`, `quiz.choose`, `quiz.act` (type/value/ index for the newer games), `quiz.confirm`, `quiz.next`, `quiz.resolve`, `quiz.timeout`, `quiz.end`, and `quiz.nextRound`. The quiz does not render `正確`/`錯誤` feedback text; it keeps visual cues (flip, selected state, paired fade, path line, HP/life bars, brief flashes) and, when a reveal is needed, the `正確答案：…` line.

#### Quiz completion

When lives run out, or when every batch finishes, the run ends on the `quiz-play` screen: a `🎉` victory or `💔` end line, the final score, and a `返回主頁` control. Between rounds a short panel shows the round result and a `下一回合` control.

## Completion

Card mode only. `完成`, or a forward swipe on the last card, replaces the study body with:

- One emoji, drawn once when the panel mounts, chosen from `🙇‍♂️`, `🙇`, or `🙇‍♀️`.
- `恭喜，你已經做完了練習。`
- `返回主頁`, 60px, runs `nav.go` to `home`.

There is no score, no bar, and no 錯誤的單詞 list. The quiz page has no completion screen.

## Readings

Ruby aligns `japanese` across `kanji`. `kanji` has no per-character alignment to `japanese`.

1. When `kanji` is `null`, render `japanese` with no ruby.
2. Treat katakana inside `kanji` as hiragana only while aligning. Render katakana as katakana.
3. Walk left to right. A kana character on `kanji` (including `ー`) that equals the next character of `japanese` is okurigana and is rendered with no ruby.
4. A run of kanji takes the reading up to the next okurigana; that slice is the `rt`.
5. When the strings do not align, show the full `japanese` above the whole `kanji`. Do not invent a misaligned ruby.

Tests cover `私/わたし`, `違います/ちがいます`, and a `kanji: null` entry that renders `これ` with no ruby. The pure aligner also covers `置く/おく`, `勉強する/べんきょうする`, and `コピーする/コピーする` as alignment cases. Those three are not a requirement that the product files contain them.

## Motion

Match these invariants. Timing and scrollbar details that this list does not contradict may follow the conjugation site's Look and motion and paging-window sections. Where they disagree, this spec wins.

- Viewport meta pins scale (`maximum-scale=1, user-scalable=no`). `html` and `body` use `touch-action: manipulation`. Gesture surfaces use `touch-action: pan-y`.
- Short screens size to `dvh` (`vh` fallback). Root `overscroll-behavior-y: none`. A non-passive `touchmove` guard cancels only a one-finger vertical drag that the nearest scroll container cannot consume.
- The native vertical scrollbar is hidden. The page draws a 4px thumb. Dropdowns that overflow draw their own thumb. Thumbs are not drawn when the content fits. Under reduced motion they still appear, without a fade.
- System font stack: `Hiragino Sans`, `Noto Sans TC`, `Noto Sans JP`, `sans-serif`. Do not download a CJK webfont.
- Controls are 36px with a 10px radius, except the sizes named on each screen. Settings rows are 52px. The quiz page has no keys.
- Top bars pin to the viewport on the column colour. Icons are Lucide, inlined: `ArrowLeft`, `Settings`, `List`, `Search`, `X`, `ChevronLeft`, `ChevronRight`, `Moon`, `Sun`. No icon font and no CDN.
- A pressed button scales down slightly. Dropdown rows tint instead of scaling. Paging is one flat horizontal slide, about 190ms, decelerating, no overshoot, no second slide. Screen changes take about 220ms.
- The page never scrolls sideways.
- Under `prefers-reduced-motion: reduce`, the gradient is still, drags are invisible, swipes change the item immediately, card flips are instant, and screen changes are a short fade.

## Saved settings

localStorage key `study-minna-no-nihongo-vocabulary-basic-settings`:

| Field | Default |
|---|---|
| Lesson numbers for `words` and for `card` | `[]` each |
| `card` direction | `jp-zh` |
| 顯示平假名注音 for `words` and for `card` | on |
| 顯示例句 | on |
| 一開始顯示讀音 | on |
| 只顯示平假名 for `card` | off |

Unknown fields are dropped on load. Invalid JSON resets the whole object to the defaults. A missing field uses the default. Theme uses `study-minna-no-nihongo-vocabulary-basic-theme` and is not inside this object. Search text, the in-run index, and the shuffle order are not stored.

The quiz setup is stored separately under localStorage `study-minna-no-nihongo-vocabulary-basic-quiz`, with these defaults:

| Field | Default |
|---|---|
| `lessons` | `[]` |
| `count` | `all` |
| `modes` | `[]` (means every concrete mode) |
| `random` | off |
| `lives` | `infinite` |
| `time` | `infinite` |

Unknown quiz fields are dropped on load and invalid values fall back to the default, the same as the word/card settings object.

Do not read or write `game-japanese-katsuyou-basic-settings` or `game-japanese-katsuyou-basic-theme`.

## Storage migration

The storage keys were renamed from the earlier `words-*` names. The adapters
copy the old value over on first read/write and then remove the old key, so an
existing user keeps their settings, theme, and cached lessons. The exact rules
are in [`architecture.md`](architecture.md) → Storage migration; in brief:

- localStorage `words-settings` → `study-minna-no-nihongo-vocabulary-basic-settings`, and `words-theme` → `study-minna-no-nihongo-vocabulary-basic-theme`. On load, when the new key is missing the old value is copied and the old key is removed; when both exist the new value wins and the old key is dropped. `save` writes only the new key. A failed read/write leaves the old key in place.
- IndexedDB `words-dict` → `study-minna-no-nihongo-vocabulary-basic-dict` (store `lists`). On first open, records are copied from the old database when the new store is empty; existing new data is kept; and the old database is deleted after a successful copy (or when it was empty). A failed copy leaves the old database for a later retry.

## Build

`npm run build` writes `output/`. `base` is `/study-minna-no-nihongo-vocabulary-basic/`. `npm run dev` and `npm run preview` serve that subpath (`/` redirects to it). Asset and archive URLs are prefixed with the base. The runtime fetches `dict/vol.bin` against `document.baseURI`. The shipped manifest has 50 lessons, so the production build publishes that archive.

The document title is `大家の單詞`, and `index.html` declares the site's logo as icons derived from `docs/img/logo.jpg`: `docs/img/favicon.ico` (16, 32 and 48px), `docs/img/favicon-32.png`, `docs/img/favicon-192.png` and `docs/img/apple-touch-icon.png` (180px), with `docs/img/logo-512.png` kept as the 512px copy of the same artwork. `index.html` references them with relative paths, so Vite hashes each file into `output/assets/` and prefixes it with the base; no root-absolute `/favicon.ico` and no third-party icon host. Do not copy the conjugation logo.

`predev`, `pretest`, and `prebuild` run `node scripts/write-sha256.mjs --check` only. The check hashes `vol/lesson_*.json`. A build needs no network. `output/` is gitignored. `output/dict/vol.bin` contains 50 lesson entries.

## Out of scope until a later spec revision

A kana keyboard (the quiz is tap-driven), audio and Opus bins, accounts, a backend, a model call, conjugation forms, 從/到, 學習, and 變形說明. Google Tag IDs stay empty through T9. `image` stays undrawn while every value is `null`.

## Analytics

T9, after T8, wires the same page-view path as the conjugation site. The shipped IDs stay empty. Pasting real IDs is a later edit, done only when the user supplies them, and it touches no other file.

`src/config/analytics.js` exports `GTM_ID` and `GA4_ID`. Both ship as `''`. An empty string, or a string that is not a valid container (`GTM-` plus 4 to 12 letters or digits) or measurement id (`G-` plus 6 to 20 letters or digits), disables that script. The settings screens have neither field. `study-minna-no-nihongo-vocabulary-basic-settings` has no `analytics` section. A stray `analytics` key is dropped on load like any other unknown field.

While an ID is disabled, its script is not added to the page. With both IDs empty, the built site loads no Google script. Do not copy `GTM-W7387LLQ` or `G-NFDK8SXY0M` from the conjugation site. Do not invent a replacement.

When an ID is present, `src/analytics/gtm.js` loads it the way the reference does: one `dataLayer`, one async `gtm.js` for the container, and gtag.js with `send_page_view: false` for the measurement id. There is no `<noscript>` iframe. A container is not loaded twice.

The browser URL never changes. Screen changes are reported, not routed. Every screen change pushes `{ event: 'page_view', screen_name, page_title, page_location }` and, from the first screen after the landing, sends the same payload through `gtag('event', 'page_view', …)`. `loading` and the first `home` send no second page view; the container's own landing view covers them. A later return to `home` does send one. Turning a word or a card pushes nothing.

`screen_name` is the screen id. `page_title` is `大家の單詞` on `home`, and `<screen title> · 大家の單詞` on every other screen. Screen titles, in screen order: 載入中, 主頁, 詞彙, 單詞, 單詞目錄, 字形對照, 練習, 測驗, 測驗, 設定 (`quiz` and `quiz-play` share the `測驗` title). `page_location` is the page URL plus `#/<screen>`. Only those fields leave the page: no answer, typed input, lesson, or score.

Pure rules live in `src/analytics/page-view.js`. `src/main.js` reads the config and watches `session.screen`. No `.vue` file mentions the IDs.
