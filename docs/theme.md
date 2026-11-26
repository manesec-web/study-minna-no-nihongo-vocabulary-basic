# Blue theme

Revision 2 changes no token. Authority for colour. Behavior of the switch is in [`spec.md`](spec.md) → Theme. Every colour the site paints comes from the tokens below. A `.vue` file, a component, or a JS string does not write a hex colour, an `rgb()`, or a raw gradient.

The brand is blue. Light and dark are both blue. The katsuyou palette — indigo accent `#4a3f9f` / `#8a7bf5`, purple highlight `#7c3aed` / `#bda6ff`, warm paper `#fbf7ef`, amber `#c9853f`, and the indigo→amber page gradient — does not appear in this site.

## Token roles

| Token | Role |
|---|---|
| `--ink`, `--ink-soft`, `--muted` | Text, secondary text, quiet text |
| `--column`, `--bg`, `--surface`, `--surface-strong` | Page column and raised surfaces. Light column is cool paper, not warm ivory |
| `--accent`, `--accent-ink` | Primary buttons. `--accent-ink` is the label on `--accent` and must stay readable. Dark theme uses dark ink on a light blue, not white on light blue |
| `--highlight` | The studied word inside an example sentence. A blue-teal, distinct from `--accent` |
| `--note` | Usage notes. Warm, so a note is not another blue |
| `--error`, `--error-strong` | Wrong answers, the disabled 開始 border, search hits in 單詞目錄 |
| `--line` | Hairlines and dividers |
| `--tooltip`, `--tooltip-ink` | Tooltip and toast chips |
| `--tint`, `--tint-strong`, `--track`, `--accent-tint` | Hover, pressed row, switch track, selected-row wash |
| `--thumb`, `--thumb-edge` | Drawn scroll thumbs |
| `--overlay` | Sheet backdrop |
| `--draw-overlay` | Full-screen dim behind the 3×3 隨機抽卡 reveal |
| `--knob` and the `--shadow-*` tokens | Switch knob and elevation |
| `--progress-from`, `--progress-to` | Loading bar. Blue to cyan |
| `--link-strong` | Text links |
| `--page-background` | The desktop gradient behind the column. Both stops are blue |
| `--grain-opacity`, `--grain-image` | Faint grain over the gradient |
| `--radius`, `--shadow` | Column frame |

`--radius` is `28px` in both themes. Motion easings match the katsuyou `app.css` easings (`--ease-slide`, `--ease-exit`, `--ease-turn`); they are not colours.

## Light

```css
:root {
  color-scheme: light;
  --ink: #1a2740;
  --ink-soft: #4d5d78;
  --column: #f4f8fc;
  --accent: #1d6adf;
  --accent-ink: #ffffff;
  --highlight: #0b7ea8;
  --note: #9a5b12;
  --error: #dc2626;
  --line: rgba(26, 39, 64, 0.12);
  --surface: #ffffff;
  --surface-strong: #e7eef6;
  --bg: #f4f8fc;
  --muted: #7d8ba3;
  --tooltip: #1a2740;
  --tooltip-ink: #ffffff;
  --radius: 28px;
  --shadow: 0 18px 40px rgba(16, 40, 80, 0.18);
  --tint: rgba(26, 39, 64, 0.06);
  --tint-strong: rgba(26, 39, 64, 0.14);
  --track: rgba(26, 39, 64, 0.1);
  --accent-tint: rgba(29, 106, 223, 0.12);
  --thumb: rgba(26, 39, 64, 0.32);
  --thumb-edge: rgba(255, 255, 255, 0.18);
  --overlay: rgba(10, 22, 48, 0.45);
  --draw-overlay: rgba(8, 16, 32, 0.55);
  --knob: #ffffff;
  --shadow-knob: 0 1px 4px rgba(0, 0, 0, 0.25);
  --shadow-accent: 0 10px 24px rgba(29, 106, 223, 0.28);
  --shadow-card: 0 12px 30px rgba(16, 40, 80, 0.08);
  --shadow-float: 0 16px 34px rgba(16, 40, 80, 0.16);
  --shadow-pop: 0 10px 24px rgba(16, 40, 80, 0.22);
  --progress-from: #1d6adf;
  --progress-to: #3db7e8;
  --error-strong: #8a2f3a;
  --link-strong: #1d4ed8;
  --grain-opacity: 0.18;
  --grain-image:
    repeating-radial-gradient(circle at 18% 27%, rgba(255, 255, 255, 0.05) 0 1px, transparent 1px 4px),
    repeating-radial-gradient(circle at 72% 64%, rgba(0, 0, 0, 0.04) 0 1px, transparent 1px 5px);
  --page-background:
    radial-gradient(1200px 700px at 15% 10%, #1a4f9c 0%, transparent 60%),
    radial-gradient(900px 600px at 85% 90%, #49b4d8 0%, transparent 65%),
    linear-gradient(160deg, #0d2a52 0%, #164a86 48%, #2f8fbe 100%);
}
```

`index.html` sets `theme-color` to `#0d2a52`.

## Dark

Paint the dark tokens in both of these places, with the same values, so the first frame matches a dark phone before JavaScript runs:

- `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { … } }`
- `:root[data-theme='dark'] { … }`

`:root[data-theme='light']` keeps the light tokens above and needs no extra block.

```css
color-scheme: dark;
--ink: #e7eef8;
--ink-soft: #a9b7cc;
--column: #101a2b;
--accent: #7eb6ff;
--accent-ink: #08111f;
--highlight: #8fd4f0;
--note: #f0b46b;
--error: #ff7070;
--line: rgba(231, 238, 248, 0.14);
--surface: #182436;
--surface-strong: #213044;
--bg: #0b1220;
--muted: #8ea0b8;
--tooltip: #243246;
--tooltip-ink: #e7eef8;
--shadow: 0 18px 40px rgba(0, 0, 0, 0.55);
--tint: rgba(231, 238, 248, 0.07);
--tint-strong: rgba(231, 238, 248, 0.16);
--track: rgba(231, 238, 248, 0.12);
--accent-tint: rgba(126, 182, 255, 0.22);
--thumb: rgba(231, 238, 248, 0.34);
--thumb-edge: rgba(255, 255, 255, 0.14);
--overlay: rgba(4, 8, 16, 0.66);
--draw-overlay: rgba(2, 5, 12, 0.72);
--knob: #e7eef8;
--shadow-knob: 0 1px 4px rgba(0, 0, 0, 0.5);
--shadow-accent: 0 10px 24px rgba(0, 0, 0, 0.45);
--shadow-card: 0 12px 30px rgba(0, 0, 0, 0.45);
--shadow-float: 0 16px 34px rgba(0, 0, 0, 0.5);
--shadow-pop: 0 10px 24px rgba(0, 0, 0, 0.55);
--progress-from: #7eb6ff;
--progress-to: #5ec8e6;
--error-strong: #ff9a9a;
--link-strong: #9ec5ff;
--grain-opacity: 0.16;
--page-background:
  radial-gradient(1200px 700px at 15% 10%, #14386e 0%, transparent 60%),
  radial-gradient(900px 600px at 85% 90%, #0e4a5c 0%, transparent 65%),
  linear-gradient(160deg, #070d18 0%, #101c30 48%, #0c3044 100%);
```

`--grain-image` stays the light-theme value. `--radius` stays `28px`.

## Check

A test or a small script scans `src/**/*.{vue,js,css}` and fails when a colour literal appears outside `src/styles/app.css`. `app.css` may contain only the tokens in this file plus layout that refers to `var(--…)`. A comment in `app.css` may name a forbidden katsuyou hex only to say it is absent; the computed custom properties must not use those values.
