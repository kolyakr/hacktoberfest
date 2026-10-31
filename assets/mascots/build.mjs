// node assets/mascots/build.mjs: writes yurko.svg, zavuch.svg, olya.svg (stickers: white outline + soft shadow)
// and a PNG of each at 512 and 1024 px. Colours follow the deck's roles: Yurko blue, Zavuch orange, Olya teal.
// PNGs are rendered by Chrome through the excalidraw-deck skill's playwright-core.
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const INK = "#1e1e1e";
const line = `stroke="${INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;

// White sticker edge and a soft shadow around the whole drawing.
const sticker = (id, art) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs><filter id="${id}-sticker" x="-10%" y="-10%" width="120%" height="120%">
  <feMorphology in="SourceAlpha" operator="dilate" radius="11" result="edge"/>
  <feGaussianBlur in="edge" stdDeviation="6" result="blur"/>
  <feOffset in="blur" dy="5" result="drop"/>
  <feFlood flood-color="#000" flood-opacity=".22"/><feComposite in2="drop" operator="in" result="shadow"/>
  <feFlood flood-color="#fff"/><feComposite in2="edge" operator="in" result="white"/>
  <feMerge><feMergeNode in="shadow"/><feMergeNode in="white"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter></defs>
<g filter="url(#${id}-sticker)">${art}</g>
</svg>
`;

// A fluffy shape from circles: dark outline first, fill on top, so only the outer edge shows.
const fluff = (circles, fill) => `<g>${circles.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r + 3}" fill="${INK}"/>`).join("")}${circles.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r - 3}" fill="${fill}"/>`).join("")}</g>`;
const eye = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="15" ry="19" fill="${INK}"/><circle cx="${x + 5}" cy="${y - 7}" r="6" fill="#fff"/><circle cx="${x - 5}" cy="${y + 7}" r="2.5" fill="#fff"/>`;
const blush = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="19" ry="10" fill="#ff8fa3" opacity=".55"/>`;

// ── Yurko: a golden retriever on the support line (headset), keen to act ──
const yurko = sticker("yurko", `
  <rect x="148" y="335" width="216" height="140" rx="62" fill="#f2b366" ${line}/>
  <path d="M172 340 L340 340 L256 428 Z" fill="#4dabf7" ${line}/>
  <circle cx="226" cy="362" r="5" fill="#fff"/><circle cx="262" cy="378" r="5" fill="#fff"/><circle cx="290" cy="356" r="5" fill="#fff"/>
  <ellipse cx="205" cy="470" rx="36" ry="22" fill="#f8cf96" ${line}/><ellipse cx="307" cy="470" rx="36" ry="22" fill="#f8cf96" ${line}/>
  <ellipse cx="256" cy="215" rx="130" ry="120" fill="#f2b366" ${line}/>
  <path d="M146 150 C96 160 78 285 118 322 C150 345 176 296 170 232 Z" fill="#d98b3a" ${line}/>
  <path d="M366 150 C416 160 434 285 394 322 C362 345 336 296 342 232 Z" fill="#d98b3a" ${line}/>
  <ellipse cx="256" cy="272" rx="74" ry="54" fill="#fde6c4" ${line}/>
  ${eye(206, 205)}${eye(306, 205)}
  <path d="M186 172 Q204 160 222 170" fill="none" ${line}/><path d="M290 170 Q308 160 326 172" fill="none" ${line}/>
  ${blush(172, 258)}${blush(340, 258)}
  <path d="M230 244 Q256 232 282 244 Q278 266 256 270 Q234 266 230 244 Z" fill="${INK}"/>
  <ellipse cx="247" cy="244" rx="8" ry="4" fill="#fff" opacity=".7"/>
  <path d="M256 270 L256 284" fill="none" ${line}/>
  <path d="M220 286 Q256 330 292 286 Q256 300 220 286 Z" fill="#7a2e2e" ${line}/>
  <path d="M242 300 Q256 330 270 300 Q256 306 242 300 Z" fill="#ff7f96"/>
  <path d="M120 212 A136 132 0 0 1 392 212" fill="none" stroke="${INK}" stroke-width="22" stroke-linecap="round"/>
  <path d="M120 212 A136 132 0 0 1 392 212" fill="none" stroke="#1971c2" stroke-width="12" stroke-linecap="round"/>
  <rect x="98" y="182" width="40" height="66" rx="16" fill="#1971c2" ${line}/>
  <rect x="374" y="182" width="40" height="66" rx="16" fill="#1971c2" ${line}/>
  <path d="M396 246 Q402 300 334 304" fill="none" stroke="${INK}" stroke-width="14" stroke-linecap="round"/>
  <path d="M396 246 Q402 300 334 304" fill="none" stroke="#1971c2" stroke-width="6" stroke-linecap="round"/>
  <ellipse cx="324" cy="304" rx="14" ry="11" fill="${INK}"/>
`);

// ── Zavuch: a stern schnauzer in glasses and a tie, with a checked clipboard ──
const zavuch = sticker("zavuch", `
  <rect x="140" y="330" width="232" height="148" rx="60" fill="#495057" ${line}/>
  <path d="M212 334 L256 400 L300 334 Z" fill="#fff" ${line}/>
  <path d="M244 352 L268 352 L262 368 L276 420 L256 438 L236 420 L250 368 Z" fill="#e8590c" ${line}/>
  <rect x="138" y="96" width="236" height="236" rx="96" fill="#9aa1a8" ${line}/>
  <path d="M150 128 Q160 92 232 100 Q200 128 178 178 Q150 160 150 128 Z" fill="#6f767c" ${line}/>
  <path d="M362 128 Q352 92 280 100 Q312 128 334 178 Q362 160 362 128 Z" fill="#6f767c" ${line}/>
  <path d="M176 250 Q256 222 336 250 Q356 312 312 350 Q256 378 200 350 Q156 312 176 250 Z" fill="#eef0f2" ${line}/>
  <path d="M256 268 Q232 300 196 296 M256 268 Q280 300 316 296" fill="none" stroke="#adb5bd" stroke-width="4" stroke-linecap="round"/>
  <path d="M232 322 Q256 314 280 322" fill="none" ${line}/>
  <circle cx="206" cy="208" r="36" fill="#fff" fill-opacity=".35" ${line}/>
  <circle cx="306" cy="208" r="36" fill="#fff" fill-opacity=".35" ${line}/>
  <path d="M242 206 Q256 196 270 206" fill="none" ${line}/>
  <circle cx="208" cy="214" r="11" fill="${INK}"/><circle cx="304" cy="214" r="11" fill="${INK}"/>
  <circle cx="212" cy="210" r="3.5" fill="#fff"/><circle cx="308" cy="210" r="3.5" fill="#fff"/>
  <path d="M190 200 L226 205 M286 205 L322 200" fill="none" stroke="#9aa1a8" stroke-width="8" stroke-linecap="round"/>
  <path d="M158 168 Q190 140 238 176 Q206 166 170 186 Z" fill="#eef0f2" ${line}/>
  <path d="M354 168 Q322 140 274 176 Q306 166 342 186 Z" fill="#eef0f2" ${line}/>
  <path d="M232 246 Q256 236 280 246 Q276 266 256 270 Q236 266 232 246 Z" fill="${INK}"/>
  <ellipse cx="248" cy="246" rx="7" ry="3.5" fill="#fff" opacity=".7"/>
  <rect x="300" y="350" width="120" height="132" rx="12" fill="#ffd8a8" ${line}/>
  <rect x="332" y="338" width="56" height="24" rx="8" fill="#868e96" ${line}/>
  <path d="M320 392 l12 12 l22 -24 M320 436 l12 12 l22 -24" fill="none" stroke="#2f9e44" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M368 400 h36 M368 444 h36" fill="none" stroke="#e8590c" stroke-width="6" stroke-linecap="round"/>
  <ellipse cx="300" cy="420" rx="28" ry="22" fill="#9aa1a8" ${line}/>
  <ellipse cx="186" cy="468" rx="34" ry="20" fill="#9aa1a8" ${line}/>
`);

// ── Olya: a cream poodle with a teal bow, reading a chart that goes up ──
const CREAM = "#f6e7d3";
const olya = sticker("olya", `
  <rect x="146" y="336" width="220" height="140" rx="62" fill="${CREAM}" ${line}/>
  <path d="M176 340 Q256 380 336 340 L336 362 Q256 402 176 362 Z" fill="#15aabf" ${line}/>
  ${fluff([[150, 230, 44], [140, 285, 42], [156, 335, 36]], "#ead2b4")}
  ${fluff([[362, 230, 44], [372, 285, 42], [356, 335, 36]], "#ead2b4")}
  ${fluff([[256, 92, 42], [214, 108, 36], [298, 108, 36], [236, 70, 30], [278, 70, 30]], CREAM)}
  <ellipse cx="256" cy="222" rx="116" ry="110" fill="${CREAM}" ${line}/>
  <path d="M256 92 L212 66 Q200 92 214 112 Z M256 92 L300 66 Q312 92 298 112 Z" fill="#0c8599" ${line}/>
  <circle cx="256" cy="92" r="13" fill="#15aabf" ${line}/>
  <ellipse cx="256" cy="272" rx="62" ry="46" fill="#fff6ea" ${line}/>
  ${eye(212, 210)}${eye(300, 210)}
  <path d="M194 196 l-12 -8 M196 186 l-8 -12 M318 196 l12 -8 M316 186 l8 -12" fill="none" ${line}/>
  ${blush(180, 256)}${blush(332, 256)}
  <path d="M236 252 Q256 242 276 252 Q272 270 256 274 Q240 270 236 252 Z" fill="${INK}"/>
  <ellipse cx="250" cy="252" rx="6" ry="3" fill="#fff" opacity=".7"/>
  <path d="M256 274 L256 286 M234 290 Q245 300 256 288 Q267 300 278 290" fill="none" ${line}/>
  <rect x="268" y="356" width="160" height="124" rx="14" fill="#fff" ${line}/>
  <rect x="290" y="440" width="22" height="20" fill="#99e9f2" stroke="#0c8599" stroke-width="4"/>
  <rect x="324" y="420" width="22" height="40" fill="#66d9e8" stroke="#0c8599" stroke-width="4"/>
  <rect x="358" y="398" width="22" height="62" fill="#22b8cf" stroke="#0c8599" stroke-width="4"/>
  <rect x="392" y="378" width="22" height="82" fill="#0c8599" stroke="#0c8599" stroke-width="4"/>
  <path d="M288 418 L330 396 L362 376 L406 362" fill="none" stroke="#e8590c" stroke-width="5" stroke-linecap="round"/>
  <path d="M392 356 L408 361 L400 376" fill="none" stroke="#e8590c" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  ${fluff([[270, 424, 26]], CREAM)}
  ${fluff([[196, 466, 28]], CREAM)}
`);

const dogs = { yurko, zavuch, olya };
for (const [name, svg] of Object.entries(dogs)) writeFileSync(join(HERE, `${name}.svg`), svg);

const { chromium } = await import(join(HERE, "../../.claude/skills/excalidraw-deck/scripts/node_modules/playwright-core/index.mjs"));
let browser;
try { browser = await chromium.launch({ channel: "chrome" }); } catch { browser = await chromium.launch(); }
for (const scale of [1, 2]) {
  const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: scale });
  for (const [name, svg] of Object.entries(dogs)) {
    await page.setContent(`<style>body{margin:0;background:transparent}svg{display:block}</style>${svg}`);
    await page.locator("svg").screenshot({ path: join(HERE, `${name}${scale === 2 ? "@2x" : ""}.png`), omitBackground: true });
  }
  await page.close();
}
// a contact sheet to look at all three together
const page = await browser.newPage({ viewport: { width: 1560, height: 560 } });
await page.setContent(`<body style="margin:0;display:flex;gap:12px;padding:24px;background:#f4f1ea">${Object.values(dogs).join("")}</body>`);
await page.screenshot({ path: join(HERE, "sheet.png") });
await browser.close();
console.log("wrote", Object.keys(dogs).map((n) => `${n}.svg ${n}.png ${n}@2x.png`).join(" · "));
