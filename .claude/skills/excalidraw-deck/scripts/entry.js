// The browser side of a deck build: every slide becomes its own Excalidraw scene and a marked SVG on one fixed
// canvas; all slides together become one editable scene, each slide in a frame. Bundled by deck.mjs with esbuild.
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import { buildBoard, toSvg } from "./board-lib.js";

async function load(images, fonts) {
  for (const f of fonts.Excalifont) document.fonts.add(new FontFace("Excalifont", `url(/fonts/${f.file})`, { unicodeRange: f.unicodeRange }));
  document.fonts.add(new FontFace("Cascadia", "url(/fonts/Cascadia/CascadiaCode-Regular.woff2)"));
  await Promise.all([...document.fonts].map((f) => f.load()));
  for (const img of Object.values(images)) { const el = new Image(); el.src = img.dataURL; await el.decode(); img.w = el.naturalWidth; img.h = el.naturalHeight; }
}

// A slide's ids get its prefix "s<i>-", so ids only need to be unique within a slide.
function prefix(items, i) {
  const p = (v) => (typeof v === "string" ? `s${i}-${v}` : v);
  return items.map((it) => ({ ...it, id: p(it.id), ...(it.t === "arrow" ? { from: p(it.from), to: p(it.to) } : {}) }));
}

window.sketchDeck = async (deck, images, fonts) => {
  await load(images, fonts);
  const [W, H] = deck.size, GAP = 200;
  const slides = [], all = [], files = {};
  for (const [i, slide] of deck.slides.entries()) {
    const scene = await buildBoard({ items: prefix(slide.items, i) }, images);
    const svg = await toSvg(scene, false, { mark: true, frame: [W, H], fontSuffix: `s${i}` });
    const png = await toSvg(scene, true, { frame: [W, H] });
    slides.push({ i, svg, png, elements: scene.elements, files: scene.files });
    // the editable scene: slides stacked top to bottom, each in a frame named after it
    const y = i * (H + GAP), fid = `frame-${i}`;
    const [frame] = convertToExcalidrawElements([{ type: "frame", id: fid, x: 0, y, width: W, height: H, name: `${i + 1}. ${slide.title ?? ""}`, children: [] }], { regenerateIds: false });
    all.push({ ...frame, x: 0, y, width: W, height: H, seed: i + 1, versionNonce: i + 1, updated: 1, version: 1 });
    for (const e of scene.elements) all.push({ ...e, y: e.y + y, frameId: fid });
    Object.assign(files, scene.files);
  }
  return { slides, scene: { type: "excalidraw", version: 2, source: "excalidraw-deck", elements: all, appState: { viewBackgroundColor: "#ffffff", gridSize: 20 }, files } };
};
window.sketchReady = true;
