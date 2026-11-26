# Word-list contract

Revision 2. The word list is in this repository, under `vol/`. It is the source of truth. The implementing agent does not edit `vol/lesson_*.json` or `vol/schema.json`, does not invent entries, and does not copy `/project/game-japanese-katsuyou-basic/vol/`. That other tree is verb conjugations. This tree is vocabulary.

`vol/.pi/` is tool state. The app does not read it, and it is gitignored.

## Files

```text
vol/schema.json          field rules; not packed into the archive; not fetched at runtime
vol/lesson_1.json
…
vol/lesson_50.json
```

There are 50 lesson files, `lesson_1.json` through `lesson_50.json`, no gaps, no leading zeros. Each file is one UTF-8 JSON document:

```json
{
  "lesson_1": {
    "vols": [ { "japanese": "わたし", "kanji": "私", "chinese": "我" } ]
  }
}
```

The root key matches the filename stem. `vols` is the entry array, in file order. That order is the reader order inside the lesson. Lessons run from 1 to 50.

Current counts, already checked against the files: 1,747 entries, 34,940 sentences, every entry has 20 sentences, no lesson is empty (the smallest lesson has 11 entries, the largest 54). 461 entries have `kanji: null`. 700 have a `note`. 1,724 have a `kanji_note`; 23 have `kanji_note: null`. Every `image` is `null`.

## Entry

Keys, in the order they appear in the files:

| Field | Rule |
|---|---|
| `japanese` | Non-empty string. The reading, as the textbook writes it. Verbs are the ます形, for example `おきます`, `ちがいます`. Hiragana, katakana, and `ー` are allowed |
| `kanji` | String or `null`. The written form. `null` means the headword is the kana in `japanese` (`これ`, `あなた`) |
| `chinese` | Non-empty string. Traditional Chinese gloss, printed exactly as stored |
| `image` | Always `null`. The screen draws no image and no image slot |
| `note` | String or `null`. Usage note. `null` means the note block is absent |
| `kanji_note` | `null`, or an object `{ summary, details }`. `null` means the 字形對照 block is absent. `summary` is a non-empty string and does not include the heading `【字形對照】`. `details` is a non-empty array of `{ jp, zh, note }` in that key order. `jp` is a non-empty string. `zh` and `note` are a string or `null` |
| `tags` | One or two strings from the tag table below |
| `speech` | One or two strings from the speech table. A verb is exactly `["verb", "verb_group_1"]`, `["verb", "verb_group_2"]`, or `["verb", "verb_group_3"]`, verb first. A non-verb does not carry `verb_group_*` |
| `sentence` | Exactly 20 objects, each `{ japanese, chinese }`, both non-empty strings. Sentences have no `note` |

Unknown keys are not drawn. A missing required field, a root key that does not match the filename, an `image` that is not `null`, a bad `speech` or `tag`, or a sentence count other than 20 makes `scripts/write-sha256.mjs` exit non-zero. The app does not repair the file.

There is no per-entry `id`, no `group`, no 15 form keys, and no `error_usage`. Identity inside a run is the lesson number plus the index in `vols`.

## Display word

- `kanji` is a string: the display word is `kanji`, and `japanese` is its reading.
- `kanji` is `null`: the display word is `japanese`, and there is no second reading line.

## On-screen labels

The UI does not print the English ids. `vol/schema.json` is not fetched. Use these labels.

Speech. When `verb_group_*` is present, draw that one pill and do not also draw `動詞`.

| id | Label |
|---|---|
| `noun` | 名詞 |
| `verb` | 動詞 |
| `verb_group_1` | 1類動詞 |
| `verb_group_2` | 2類動詞 |
| `verb_group_3` | 3類動詞 |
| `i_adjective` | い形容詞 |
| `na_adjective` | な形容詞 |
| `adverb` | 副詞 |
| `demonstrative` | 指示詞 |
| `determiner` | 連體詞 |
| `conjunction` | 接續詞 |
| `interjection` | 感嘆詞 |
| `set_phrase` | 固定套句 |
| `bound_morpheme` | 附著語素 |

Tags. Draw every tag on the entry, in file order.

| id | Label |
|---|---|
| `people_role_address` | 人與稱呼 |
| `object_tool` | 物品 |
| `place_facility` | 場所 |
| `time_date_quantity` | 時間與數量 |
| `action_activity` | 動作 |
| `quality_state_degree` | 性質與程度 |
| `transportation_movement` | 移動 |
| `food_housing_daily_life` | 食衣住 |
| `communication_language_study` | 語言與學習 |
| `greeting_conversational` | 招呼與會話 |
| `grammar_pattern` | 文法句型 |
| `reference_demonstrative` | 指示詞 |
| `function_word` | 功能語 |
| `culture_entertainment` | 文化娛樂 |
| `nature` | 自然 |
| `direction_position` | 位置方向 |

Lesson chip and the lesson pill both read `第N課`, with N taken from the filename. The files have no `title` field.

## Archive and cache

`scripts/write-sha256.mjs` hashes the raw bytes of each `vol/lesson_N.json` and writes `src/data/vol-manifest.json`. It does not hash `schema.json` or anything under `vol/.pi/`. Humans do not edit the manifest. `--check` exits non-zero when the manifest and the files disagree, or when a lesson file breaks the rules above.

The manifest record is `{ "name": "lesson_1.json", "id": "lesson_1", "sha256": "<lowercase hex>" }`, inside `{ "files": [ … ] }` in lesson order. The committed manifest lists all 50 files.

The build writes one ZIP, `dict/vol.bin`, served as `application/octet-stream` (no `.zip` suffix). Entries are the 50 lesson files, deflate-compressed, names `lesson_N.json`, bytes identical to `vol/`. Fixed timestamps. `schema.json` is not an entry. The packer refuses to pack when `--check` would fail.

IndexedDB database `study-minna-no-nihongo-vocabulary-basic-dict`, object store `lists`, key `lesson_N.json`, value the raw file bytes. This name is not `game-japanese-katsuyou-basic-dict`: both sites are meant to live on `https://manesec-web.github.io`, and IndexedDB is per origin. The older `words-dict` database is migrated to this name on first open — records in the same object store are copied into the new database when the new store is empty, existing new data is kept, and the legacy database is deleted after a successful copy (or when it was empty); a failed copy leaves the old database for a later retry. See [`architecture.md`](architecture.md) → Storage migration.

Boot, in manifest order:

1. Hash a lesson already in IndexedDB. A match counts as finished.
2. Collect missing or corrupt lessons. When the collection is empty, stop.
3. Otherwise download `dict/vol.bin` once, inflate only the collected entries, hash each against its manifest record, and store only matches.
4. A failed download, an unreadable archive, a missing entry, or a hash mismatch retries with one second download. Bytes that still fail are not stored. Boot stops, names the file, and offers retry.

`boot.total` is the manifest length. For this repository that is 50. The loading bar never moves backwards: verified files over `boot.total`, then download bytes over `Content-Length` filling the remainder, then hold at 100% while extracted files are checked. A response with no length holds the bar at the cache-check position until the bytes arrive. A retry restarts the download portion at the already-verified fraction.

An empty manifest is only a test fixture. It finishes boot without a fetch. The shipped manifest is not empty.

## Tests

Unit tests may inject a two-entry library in memory. They must not write those entries into `vol/`. Ruby cases that are not in the product files stay inside the test, labeled as alignment cases.
