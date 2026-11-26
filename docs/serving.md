# Serving locally

This applies to the built site. Behavior: [`spec.md`](spec.md). Data: [`data-contract.md`](data-contract.md).

## Correct ways to run

```bash
npm run dev       # http://localhost:5173/study-minna-no-nihongo-vocabulary-basic/
npm run preview   # http://localhost:4173/study-minna-no-nihongo-vocabulary-basic/ (after npm run build)
```

`vite.config.js` pins `base = '/study-minna-no-nihongo-vocabulary-basic/'`. Open the subpath, not the server root.

A static server works when `output/` is mounted at that subpath:

```bash
npm run build
mkdir -p /tmp/words-site
cp -r output /tmp/words-site/study-minna-no-nihongo-vocabulary-basic
cd /tmp/words-site && python3 -m http.server 8000
# open http://localhost:8000/study-minna-no-nihongo-vocabulary-basic/
```

Serving `output/` at `/`, or opening `index.html` with `file://`, fails. Built asset URLs sit under the Pages subpath. `crypto.subtle` is missing outside `https://`, `http://localhost`, and `http://127.0.0.1`, so boot cannot hash on a LAN IP or on `file://`.

## Archive

The shipped manifest has 50 lessons. Boot requests `dict/vol.bin`, a ZIP served as `application/octet-stream`. Download-helper extensions hijack `.zip` URLs. `unzipit` reads the bytes. `schema.json` is not in the archive. A 404 on `dict/vol.bin` stops boot and offers retry.

## `載入失敗` checklist

| Cause | Fix |
|---|---|
| Wrong subpath | Serve `output/` at `/study-minna-no-nihongo-vocabulary-basic/` |
| Stale build | `npm run build` and confirm `output/index.html` and `output/dict/vol.bin` |
| Insecure origin | localhost, an HTTPS tunnel, or GitHub Pages |
| Blocked IndexedDB `study-minna-no-nihongo-vocabulary-basic-dict` | Unblock storage or clear site data for this origin |
| Corrupt cache after two archive downloads | Delete the `study-minna-no-nihongo-vocabulary-basic-dict` database and retry |
| Manifest out of date | `node scripts/write-sha256.mjs` then rebuild |

Do not clear `game-japanese-katsuyou-basic-dict` to fix this site, and do not clear `study-minna-no-nihongo-vocabulary-basic-dict` to fix the conjugation site. They share an origin on GitHub Pages and use different database names on purpose.

## GitHub Pages

Pages serves HTTPS. Publish the contents of `output/` (gitignored) at the root of the Pages branch. The planned site is `https://manesec-web.github.io/study-minna-no-nihongo-vocabulary-basic/`.
