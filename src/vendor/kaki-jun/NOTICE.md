# kaki-jun (vendored)

This directory vendors the stroke-order animation library the product uses for
the 字形對照 detail page. It is not published on npm, so its source is checked
in here instead of listed as a package dependency.

- Source: https://github.com/code4fukui/kaki-jun (default branch `master`)
- Files vendored: `createKanjivg.js` and `dist/KanjivgAnimate.js`, byte-for-byte
  from that repository. `kaki-jun.js` (the `<kaki-jun>` custom element) is not
  used here: the page drives playback with a button, so it imports the two
  modules directly.

## How it works

`createKanjivg` fetches a character's vector glyph from the KanjiVG project
(https://kanjivg.tagaini.net/kanjivg/kanji/XXXXX.svg). `KVGAnimator` reveals the
fetched SVG's strokes one by one. No stroke data is bundled or invented: the
data is KanjiVG's, fetched at run time. When a character has no KanjiVG data
(e.g. a Traditional Chinese form KanjiVG does not carry) or the network is
unavailable, `src/study/glyph-strokes.js` catches the failure and the page shows
that side as unavailable instead of breaking.

## License

kaki-jun and its data source, KanjiVG, are released under the Creative Commons
Attribution-Share Alike 3.0 license. See the project README:

https://github.com/code4fukui/kaki-jun

The KanjiVG glyphs carry their own attribution header (Ulrich Apel,
KanjiVG, CC BY-SA 3.0) inside each fetched SVG.
