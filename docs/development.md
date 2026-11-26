# Development

Current. Setup is this file. Behavior is [`spec.md`](spec.md). Wiring is [`architecture.md`](architecture.md). Serving traps are [`serving.md`](serving.md).

## Requirements

Node.js `^20.19.0` or `>=22.12.0` (Vite 7). Stack to install, and nothing else at runtime:

| Package | Role |
|---|---|
| `vue` `^3.5.0` | views |
| `lucide-vue-next` | icons named in the spec |
| `unzipit` | read `dict/vol.bin` |
| `opencc-js` `^1.4.2` | the 字形對照 details page's `簡` column (Traditional → Simplified) |
| `@vitejs/plugin-vue`, `vite` `^7` | build |
| `vitest` `^3` | unit tests |
| `fake-indexeddb` | boot tests |
| `playwright-core` | `scripts/browser-check.mjs` only |

Do not add vue-router, Pinia, a CJK webfont, an analytics npm package, or an HTTP client. The stroke-order library `code4fukui/kaki-jun` is not published on npm, so its two used modules are vendored under `src/vendor/kaki-jun/` (see `NOTICE.md`) instead of being listed as a dependency; its stroke data is fetched from KanjiVG at run time, never bundled. T9 loads Google's script from `googletagmanager.com` only when the matching ID is non-empty. The committed IDs are empty, so a normal build requests nothing from Google.

`package.json` name: `study-minna-no-nihongo-vocabulary-basic`. `"type": "module"`. Private. Version `0.1.0`.

## Scripts

| Script | Role |
|---|---|
| `predev` / `pretest` / `prebuild` | `node scripts/write-sha256.mjs --check` |
| `dev` | Vite. Opens `http://localhost:5173/study-minna-no-nihongo-vocabulary-basic/` |
| `build` | `vite build` → `output/` |
| `preview` | `vite preview` of `output/` |
| `test` | `vitest run` |
| `test:watch` | `vitest` |

`npm run build` reads `vol/lesson_*.json` from disk and must succeed offline. It does not fetch audio and does not regenerate conjugation tables. It does not edit `vol/`.

## Intended tree

See the file map in [`architecture.md`](architecture.md). `.gitignore`:

```text
node_modules/
output/
dist/
vol/.pi/
*.local
.DS_Store
```

`vol/lesson_*.json` and `vol/schema.json` are committed and read-only. `src/data/vol-manifest.json` is committed. `output/` is not. `vol/.pi/` is not part of the app.

## Data

Lesson files follow [`data-contract.md`](data-contract.md). They are already in `vol/`. The implementing agent generates the manifest from those bytes and does not author or reformat `lesson_*.json`.

When a lesson file changes, regenerate the manifest before the next boot:

```bash
node scripts/write-sha256.mjs
node scripts/write-sha256.mjs --check
npm test
npm run build
```

## Checks the agent runs at the end of each task

```bash
npm test
npm run build
```

From T3 onward, also:

```bash
node scripts/browser-check.mjs
```

`browser-check.mjs` starts `vite preview` itself. Env: `PORT` (default `5199`), `CHROMIUM_PATH` (default `/home/mane/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome`), `SHOT_DIR`, `--screenshots`. If Chromium is missing, say so; do not claim the browser pass.

`SITE_BASE` inside that script is `/study-minna-no-nihongo-vocabulary-basic/`, the same string as `base` in `vite.config.js`.

## Deploy

Publish the contents of `output/` at the root of the GitHub Pages branch. Pages adds the repository subpath. Planned URL: `https://manesec-web.github.io/study-minna-no-nihongo-vocabulary-basic/`. Renaming the repository means changing `base` and `SITE_BASE` together.

`crypto.subtle` and IndexedDB need a secure origin. Use `npm run dev`, `npm run preview`, or HTTPS. Details: [`serving.md`](serving.md).
