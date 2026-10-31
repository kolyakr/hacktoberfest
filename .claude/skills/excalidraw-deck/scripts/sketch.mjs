// A Chrome page that serves the bundle and Excalidraw's fonts, ready to run window.sketchDeck on a deck.
// The bundle is (re)built with esbuild whenever entry.js, board-lib.js or palette.js is newer than it.
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { build } from "esbuild";

export const HERE = dirname(fileURLToPath(import.meta.url));
const BUNDLE = join(HERE, ".cache/bundle.js");
export const FONTS = join(HERE, "node_modules/@excalidraw/excalidraw/dist/prod/fonts");
const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };
const TYPES = { ".js": "text/javascript", ".woff2": "font/woff2" };

export const loadSpec = async (file) => (await import(pathToFileURL(resolve(file)).href + "?t=" + Date.now())).default;
export const fonts = JSON.parse(readFileSync(join(HERE, "fonts.json"), "utf8"));

// The photos a deck uses, as data URLs keyed by their path in the spec (relative to the spec file).
export function specImages(deck, specFile) {
  const images = {};
  for (const it of deck.slides.flatMap((s) => s.items)) if (it.t === "photo" && !images[it.file]) {
    const p = resolve(dirname(specFile), it.file);
    images[it.file] = { mime: MIME[extname(p).toLowerCase()], dataURL: `data:${MIME[extname(p).toLowerCase()]};base64,` + readFileSync(p).toString("base64") };
  }
  return images;
}

async function bundle() {
  const srcs = ["entry.js", "board-lib.js", "palette.js"].map((f) => statSync(join(HERE, f)).mtimeMs);
  if (existsSync(BUNDLE) && statSync(BUNDLE).mtimeMs > Math.max(...srcs)) return;
  mkdirSync(dirname(BUNDLE), { recursive: true });
  await build({
    entryPoints: [join(HERE, "entry.js")], bundle: true, format: "iife", outfile: BUNDLE, logLevel: "warning",
    define: { "process.env.NODE_ENV": '"production"' }, loader: { ".woff2": "dataurl", ".wasm": "binary" },
  });
}

export async function openSketch() {
  await bundle();
  let browser;
  try { browser = await chromium.launch({ channel: "chrome" }); } catch { browser = await chromium.launch(); }
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") { const t = m.text(); if (!/subsetting|WorkerUrl/.test(t)) console.log("[page]", m.type(), t.slice(0, 300)); } });
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.route("http://sketch.local/**", async (route) => {
    const p = decodeURIComponent(new URL(route.request().url()).pathname);
    let file = null;
    if (p === "/") return route.fulfill({ contentType: "text/html", body: `<!doctype html><meta charset=utf-8><body style="margin:0;background:#fff"><div id=out></div><script>window.EXCALIDRAW_ASSET_PATH="http://sketch.local/";</script><script src="/bundle.js"></script>` });
    if (p === "/bundle.js") file = BUNDLE;
    else if (p.startsWith("/fonts/")) file = join(FONTS, p.slice(7));
    if (!file || !existsSync(file)) { console.log("[404]", p); return route.fulfill({ status: 404, body: "" }); }
    return route.fulfill({ contentType: TYPES[extname(file)] || "application/octet-stream", body: readFileSync(file) });
  });
  await page.goto("http://sketch.local/");
  await page.waitForFunction("window.sketchReady === true");
  return { browser, page };
}
