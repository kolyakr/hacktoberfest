---
name: excalidraw-deck
description: Make a hand-drawn Excalidraw slide deck with animations (slides sketch themselves in, steps reveal items stroke by stroke, a dot travels along arrows, spotlight/dim, captions) from a small JS spec. Outputs a self-contained HTML deck, an editable .excalidraw (one frame per slide), an Obsidian .excalidraw.md and a PNG per slide. Use when asked for a presentation, pitch deck, slides or animated diagram "in Excalidraw" / "hand-drawn".
---

# Excalidraw deck

A deck is one spec file (`deck.mjs`); `scripts/deck.mjs` turns it into a deck through Excalidraw's own API in headless Chrome.
The engine is hippocat's board builder (`docs/archive/2026-10-28-excalidraw-boards/`), with a slide mode on top.

## Setup (once per machine)
```bash
S=.claude/skills/excalidraw-deck/scripts
npm install --prefix $S          # Excalidraw 0.18.1, React, esbuild, playwright-core (~15 s)
```
Needs Google Chrome installed (Playwright drives it). The Excalidraw bundle is built into `$S/.cache/` automatically.

## Loop: write → build → look → fix (2–4 rounds)
```bash
node $S/deck.mjs slides/pitch.mjs slides/out/pitch            # → .html .excalidraw .excalidraw.md .pdf -png/NN.png
node $S/deck.mjs slides/pitch.mjs slides/out/pitch --only 2   # PNG of slide 3 only (index from 0)
node $S/check-deck.mjs slides/out/pitch.html <scratch>/check  # walks every step in Chrome, screenshots, page errors
```
**Read the PNGs (and a few check screenshots) after every build.** They show overlaps, wrapped labels and arrows through
text that the spec doesn't. Fix the spec, rebuild. Don't call a deck done before looking at every slide.

Present: open `pitch.html` in a browser (works offline from `file://`), press **F**.

| Key | |
|---|---|
| → space click (right ¾) | next step, then next slide |
| ← click (left ¼) | back one step / slide |
| F · O · D | fullscreen · overview grid · dark |
| N · C | speaker notes · copy this slide into Excalidraw (paste on excalidraw.com) |
| `#3` in the URL | open at slide 3 |

Other uses of the outputs: drag `pitch.excalidraw` onto excalidraw.com to edit (each slide is a frame);
the PDF (one slide per page) and the PNGs go into Google Slides / PowerPoint / the submission when HTML isn't allowed; record the HTML deck with a screen
recorder for a video with the animations.

## The spec
```js
export default {
  title: "Deck title", lang: "uk",          // lang: the page's <html lang>
  size: [1600, 900],                         // the canvas every slide is drawn on (default); 16:9
  enter: "draw",                             // how slides arrive: "draw" (sketch in, default) or "none"
  slides: [
    {
      title: "Як це працює",                 // frame name, overview, aria
      items: [ /* drawing, in canvas coordinates: x 0–1600, y 0–900 */ ],
      steps: [                               // optional; each → press is one step
        { show: ["b", "a1"], trip: "a1", say: "caption at the bottom" },
        { show: ["c"], focus: "c", dim: ["a", "b"], pulse: ["x"], lit: ["t"] },
        ["d", "e"],                          // shorthand for { show: [...] }
      ],
      notes: "speaker notes (N)",
    },
  ],
};
```
Step fields: `show` ids start hidden and draw in on that step · `trip` an arrow id (or list) the dot runs along ·
`focus` id(s) get an orange glow · `dim` ids fade to 20% · `pulse` ids bounce once · `lit` texts turn orange ·
`say` caption. Effects other than `show` last for that step only. Going back is instant (no animation).

Ids are per slide (the build prefixes `s<i>-`); arrows refer to ids on the same slide.

### Items (`t` = type)
| `t` | Fields |
|---|---|
| `heading` | `n` (number in a circle), `text`, `size` (32), `color` of the circle (yellow) |
| `text` | `text`, `size` (20), `w` wraps to width, `align: "center"` (then x is the centre), `hl: ["phrase"]` highlighter marks (swipe on after the text), `font`: hand / code / sans, `color`, `angle`, `opacity` |
| `box` | `x y w h`, `label`, `size`, `shape`: rect / ellipse / diamond, `color` (stroke + fill), `fill: false`, `hatch`, `cross`, `dashed`, `sharp`, `sw`, `rough`, `text` (label colour), `align`, `valign`, `font` |
| `arrow` | `from`/`to`: an id or `[x, y]`; `fromSide`/`toSide`: l r t b; `via: [[x,y],…]`, `sharp`, `bend` (px), `label`, `labelColor`, `dashed`, `dotted`, `both`, `line` (no head), `head`, `sw`, `bind: false` |
| `code` | `code` (string), `title` (a tab), `size` (16), `lang` sh (tokens coloured: comments, strings, flags, numbers, `key:`), `w`, `color`, `bg` |
| `photo` | `file` (path relative to the spec), `w` (h from the image), `swatch` colour (frame + square), `caption`, `capW`, `frame: false` |
| `cloud` | `x y w h`, `label`, `bumps`, `color` |
| `poly` | `points: [[x,y],…]`, `closed`, `smooth`, `fill`, `hatch`, `dashed` |
| `wifi` | `x y`, `n` arcs, `r0`, `dr`, `spread`, `dir` (degrees) |

Any item takes `link` (a URL; clickable in Excalidraw). Colours are palette names: ink, red, orange, yellow, green,
teal, blue, violet, pink, gray (Excalidraw's own stroke/fill pairs), or a hex. No `tex`: formulas would need MathJax
(hippocat has it); put a formula in as a `photo` instead.

See `examples/example.mjs`: a title slide, a flow built step by step with the dot, and marked text with code.

## Layout rules (learned the hard way)
- **A slide makes one point.** Its heading says the point; the drawing argues it: every relationship is an arrow,
  colour = role (keep one colour per actor across the deck), at most ~6 boxes.
- **Legibility on a projector:** body ≥ 24 px, labels ≥ 20 px, code ≥ 18 px, slide titles 40–56 px, title slide
  80–100 px. Keep 80 px margins; the caption covers y > 780 when a step has `say`.
- **Text:** `align: "center"` text is placed by its centre x. Box labels wrap and grow the box: at 20 px about
  34–38 characters fit in 430 px; use `\n` to break labels yourself. Excalifont has Latin and Cyrillic (incl. ґ є і ї)
  but no ✓ ✗ ≈ or superscripts: draw ticks as shapes or use emoji (🟢 🟡 🔴 render in colour).
- **Arrows bind only to box/ellipse/diamond** (and move with them in Excalidraw); to text, code, photos and clouds they
  just end at the edge. `via` curves overshoot; add `sharp: true` for corners. A long label hides a dashed line: put it
  in its own `text` beside the arrow. For `trip`, the dot follows the arrow from `from` to `to`.
- **Build order:** hidden items should appear in reading order (left→right, top→bottom). Reveal an arrow together
  with the box it points to, and trip along it in the same step.
- **Deterministic:** ids seed the roughness, so a slide looks the same every build; rename an id and its wobble changes.
- **Photos:** resize and compress first (each is inlined as base64 in every output).

## Study notes
If the deck is study notes and the user's instructions keep Excalidraw boards in a notes vault (Obsidian), also copy
`<out>.excalidraw.md` there, in the folder and format those instructions name.
