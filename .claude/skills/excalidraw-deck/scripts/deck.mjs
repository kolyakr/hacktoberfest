// node deck.mjs <deck.mjs> <outBase> [--no-png] [--only <n>]
//   <outBase>.html             the animated deck: one self-contained page, no network calls
//   <outBase>.excalidraw       every slide in a frame, stacked; opens in excalidraw.com
//   <outBase>.excalidraw.md    the same scene as an Obsidian Excalidraw note
//   <outBase>.pdf              the PNGs, one per page
//   <outBase>-png/NN.png       each slide on white at the canvas size (1600×900), for checking and for PowerPoint/Google Slides
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { HERE, FONTS, loadSpec, specImages, fonts, openSketch } from "./sketch.mjs";

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f) => (flag(f) ? args[args.indexOf(f) + 1] : null);
const [specFile, outBase] = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--only");
if (!specFile || !outBase) { console.error("usage: node deck.mjs <deck.mjs> <outBase> [--no-png] [--only <n>]"); process.exit(1); }

const deck = await loadSpec(specFile);
deck.size ??= [1600, 900];
const only = opt("--only");
const images = specImages(deck, specFile);
const { browser, page } = await openSketch();
const res = await page.evaluate(`window.sketchDeck(${JSON.stringify(deck)}, ${JSON.stringify(images)}, ${JSON.stringify(fonts)})`);
const [W, H] = deck.size;
mkdirSync(dirname(outBase), { recursive: true });

writeFileSync(outBase + ".excalidraw", JSON.stringify(res.scene, null, 1));
writeFileSync(outBase + ".excalidraw.md", `---

excalidraw-plugin: parsed
tags: [excalidraw]

---
==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠==


# Excalidraw Data

## Text Elements
%%
## Drawing
\`\`\`json
${JSON.stringify(res.scene, null, "\t")}
\`\`\`
%%`);

// Each slide on white, for checking the layout (render → look → fix) and as a fallback deck.
if (!flag("--no-png")) {
  const dir = outBase + "-png";
  mkdirSync(dir, { recursive: true });
  await page.setViewportSize({ width: W, height: H });
  for (const s of res.slides) {
    if (only !== null && s.i !== +only) continue;
    await page.evaluate("document.getElementById('out').innerHTML = " + JSON.stringify(s.png.replace(/<svg /, '<svg style="display:block;width:' + W + "px;height:" + H + 'px" ')));
    await page.waitForTimeout(150);
    await (await page.$("#out svg")).screenshot({ path: join(dir, String(s.i + 1).padStart(2, "0") + ".png"), scale: "device" });
  }
  // every slide's PNG as one PDF page, for submissions that take PDF or slides
  if (only === null) {
    const imgs = res.slides.map((s) => `<img src="data:image/png;base64,${readFileSync(join(dir, String(s.i + 1).padStart(2, "0") + ".png")).toString("base64")}">`).join("");
    await page.setContent(`<style>@page{size:${W}px ${H}px;margin:0}body{margin:0}img{display:block;width:${W}px;height:${H}px;break-after:page}</style>${imgs}`);
    await page.pdf({ path: outBase + ".pdf", width: `${W}px`, height: `${H}px`, printBackground: true });
  }
}
await browser.close();

// The deck page: the UI font is every Excalifont subset (Latin, Cyrillic, …) inline.
const ui = fonts.Excalifont.map((f) => `@font-face{font-family:"Excalifont-ui";src:url(data:font/woff2;base64,${readFileSync(join(FONTS, f.file)).toString("base64")}) format("woff2");unicode-range:${f.unicodeRange}}`).join("\n");
const css = ui + "\n" + readFileSync(join(HERE, "deck.css"), "utf8");
const js = readFileSync(join(HERE, "deck-runtime.js"), "utf8");
const json = (v) => JSON.stringify(v).replace(/<\//g, "<\\/");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const meta = {
  title: deck.title, size: deck.size,
  slides: deck.slides.map((s) => ({ title: s.title ?? "", enter: s.enter ?? deck.enter ?? "draw", steps: (s.steps ?? []).map((st) => (Array.isArray(st) ? { show: st } : st)), notes: s.notes ?? "" })),
};
const html = `<!doctype html><html lang="${deck.lang ?? "en"}"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(deck.title)}</title>
<style>${css}</style>
<body>
<svg class="defs" aria-hidden="true"><defs>
<filter id="board-reinvert" color-interpolation-filters="sRGB"><feColorMatrix type="hueRotate" values="180"/><feComponentTransfer><feFuncR type="linear" slope="-1.1628" intercept="1.0814"/><feFuncG type="linear" slope="-1.1628" intercept="1.0814"/><feFuncB type="linear" slope="-1.1628" intercept="1.0814"/></feComponentTransfer></filter>
<filter id="hc-glow" x="-20%" y="-20%" width="140%" height="140%"><feMorphology in="SourceAlpha" operator="dilate" radius="3" result="d"/><feFlood flood-color="#ffa94d" flood-opacity=".6"/><feComposite in2="d" operator="in"/><feGaussianBlur stdDeviation="2"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs></svg>
<main class="deck">
${res.slides.map((s) => `<section class="slide" id="s${s.i}" data-i="${s.i}" aria-label="${esc(meta.slides[s.i].title)}">
  <div class="stage">${s.svg}</div>
  <script type="application/json" class="els">${json({ elements: s.elements, files: Object.fromEntries(Object.entries(s.files).map(([k, f]) => [k, { ...f, dataURL: null }])) })}</script>
</section>`).join("\n")}
</main>
<p class="say" hidden></p>
<div class="hud"><span class="n"></span><span class="hint">← → space · F fullscreen · O overview · D dark · C copy slide · N notes</span></div>
<div class="progress"><i></i></div>
<aside class="notes" hidden></aside>
<div class="toast" hidden></div>
<script>window.DECK = ${json(meta)};</script>
<script>${js}</script>
</body></html>`;
writeFileSync(outBase + ".html", html);
console.log(`${outBase}.html ${Math.round(html.length / 1024)} KB · ${res.slides.length} slides · ${res.scene.elements.length} elements · .excalidraw, .excalidraw.md${flag("--no-png") ? "" : ", .pdf, -png/"}`);
