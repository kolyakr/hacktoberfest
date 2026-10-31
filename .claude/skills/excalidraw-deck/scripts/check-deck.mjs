// node check-deck.mjs <deck.html> <outDir>: open the deck in Chrome, walk every step, screenshot mid-animation
// and settled states, and report page errors. For the render → look → fix loop.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
const [html, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
let browser;
try { browser = await chromium.launch({ channel: "chrome" }); } catch { browser = await chromium.launch(); }
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(m.text()); });
await page.goto("file://" + resolve(html));
const total = await page.evaluate("DECKUI.slides.length");
let n = 0;
const shot = async (tag) => page.screenshot({ path: join(out, `${String(++n).padStart(2, "0")}-${tag}.png`) });
await page.waitForTimeout(250); await shot("s1-drawing");
for (let guard = 0; guard < 200; guard++) {
  const before = await page.evaluate("[DECKUI.cur.i, DECKUI.cur.k]");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(450);
  const now = await page.evaluate("[DECKUI.cur.i, DECKUI.cur.k]");
  if (now[0] === before[0] && now[1] === before[1]) break;
  await shot(`s${now[0] + 1}k${now[1]}-mid`);
  await page.waitForTimeout(1600);
  await shot(`s${now[0] + 1}k${now[1]}`);
}
console.log(`${total} slides, ${n} screenshots in ${out}`);
console.log(errors.length ? "errors:\n" + errors.join("\n") : "no page errors");
await browser.close();
