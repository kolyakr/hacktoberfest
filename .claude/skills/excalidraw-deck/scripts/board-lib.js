// Turns a board spec (high-level items) into Excalidraw elements: measures text with the real fonts, wraps it,
// lays highlighter strokes under phrases, clips arrows to shapes, colours code, then converts through Excalidraw's
// skeleton API and makes every id, seed and nonce deterministic.
import { convertToExcalidrawElements, exportToSvg, getCommonBounds } from "@excalidraw/excalidraw";
import { C } from "./palette.js";

export { C };
const MARKER = "#ffa94d";
const FAM = { hand: 5, code: 3, sans: 6 };
const FAMNAME = { 5: "Excalifont", 3: "Cascadia", 6: "Nunito" };
const LH = 1.25;

const stroke = (c) => (c?.startsWith?.("#") ? c : (C[c] ?? C.ink)[0]);
const fill = (c) => (c?.startsWith?.("#") ? c : (C[c] ?? C.ink)[1]);

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) % 2147483647;
}

const ctx = document.createElement("canvas").getContext("2d");
export function measure(text, size, fam = 5) {
  ctx.font = `${size}px ${FAMNAME[fam]}`;
  return ctx.measureText(text).width;
}

function wrap(text, size, fam, width) {
  const out = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const next = line ? line + " " + word : word;
      if (line && measure(next, size, fam) > width) { out.push(line); line = word; } else line = next;
    }
    out.push(line);
  }
  return out;
}

// Where the ray from a shape's centre towards (tx, ty) leaves the shape, pushed out by gap.
function clip(g, tx, ty, gap = 8) {
  const cx = g.x + g.w / 2, cy = g.y + g.h / 2;
  const dx = tx - cx, dy = ty - cy, len = Math.hypot(dx, dy) || 1;
  let t;
  if (g.shape === "ellipse") t = 1 / Math.hypot(dx / (g.w / 2), dy / (g.h / 2));
  else t = Math.min(Math.abs(g.w / 2 / (dx || 1e-9)), Math.abs(g.h / 2 / (dy || 1e-9)));
  return [cx + dx * t + (dx / len) * gap, cy + dy * t + (dy / len) * gap];
}
const side = (g, s, gap = 8) => ({
  l: [g.x - gap, g.y + g.h / 2], r: [g.x + g.w + gap, g.y + g.h / 2],
  t: [g.x + g.w / 2, g.y - gap], b: [g.x + g.w / 2, g.y + g.h + gap],
}[s]);
const centre = (g) => [g.x + g.w / 2, g.y + g.h / 2];

// A small shell/Dockerfile/YAML tokenizer: enough to colour a board's code, not a parser.
const TOKENS = [
  [/^#.*|^←.*/, "gray"],
  [/^\$/, "gray"],
  [/^"[^"]*"|^'[^']*'/, "green"],
  [/^\d{1,3}(?:\.\d{1,3}){3}(?:\/\d+|:\d+)?/, "violet"],
  [/^--?[A-Za-z][\w-]*/, "orange"],
  [/^\d+(?:\.\d+)?\s?(?:ms|s|KB|MB|GB)?\b/, "blue"],
  [/^(?:FROM|RUN|COPY|CMD|EXPOSE|ENV|WORKDIR|ENTRYPOINT|apiVersion|kind|metadata|spec)\b/, "red"],
  [/^[A-Za-z_][\w.-]*:(?=\s|$)/, "red"],
  [/^\s+/, null],
  [/^\S/, null],
];
function tokenize(line, lang) {
  const out = [];
  let rest = line, first = true;
  while (rest.length) {
    let m, colour = null;
    for (const [re, c] of TOKENS) if ((m = rest.match(re))) { colour = c; break; }
    let text = m[0];
    // the command after a "$ " prompt
    if (lang === "sh" && colour === null && /\S/.test(text) && out.at(-1)?.prompt) {
      const w = rest.match(/^\S+/)[0];
      text = w; colour = "teal";
    }
    if (colour === null && /^\S/.test(text)) { const w = rest.match(/^[^\s"']+/)?.[0] ?? text; text = w; }
    out.push({ text, colour, prompt: text === "$" || (out.at(-1)?.prompt && /^\s+$/.test(text)) });
    rest = rest.slice(text.length);
    first = false;
  }
  return out;
}

export async function buildBoard(spec, images) {
  const sk = [];
  const files = {};
  const geo = {};
  const groups = {};
  const seed = (id) => hash(id);

  const H = {
    box(it) {
      const shape = { rect: "rectangle", ellipse: "ellipse", diamond: "diamond" }[it.shape ?? "rect"];
      const g = { x: it.x, y: it.y, w: it.w, h: it.h, shape };
      geo[it.id] = g;
      sk.push({
        type: shape, id: it.id, x: it.x, y: it.y, width: it.w, height: it.h,
        strokeColor: stroke(it.stroke ?? it.color ?? "ink"), backgroundColor: it.fill === false ? "transparent" : fill(it.fill ?? it.color ?? "ink"),
        fillStyle: it.hatch ? "hachure" : it.cross ? "cross-hatch" : "solid", strokeWidth: it.sw ?? 2, roughness: it.rough ?? 1,
        strokeStyle: it.dashed ? "dashed" : "solid", roundness: shape === "rectangle" && !it.sharp ? { type: 3 } : null,
        seed: seed(it.id), opacity: it.opacity ?? 100,
        ...(it.label ? { label: { text: it.label, fontSize: it.size ?? 20, fontFamily: FAM[it.font ?? "hand"], strokeColor: stroke(it.text ?? "ink"), verticalAlign: it.valign ?? "middle", textAlign: it.align ?? "center" } } : {}),
      });
    },
    text(it) {
      const size = it.size ?? 20, fam = FAM[it.font ?? "hand"];
      const lines = it.w ? wrap(it.text, size, fam, it.w) : it.text.split("\n");
      const full = lines.join("\n");
      if (it.hl) {
        const marked = new Array(full.length).fill(false);
        for (const phrase of it.hl) {
          const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+"), "g");
          let m; let found = false;
          while ((m = re.exec(full))) { found = true; for (let i = m.index; i < m.index + m[0].length; i++) marked[i] = true; }
          if (!found) console.warn(`highlight "${phrase}" not found in ${it.id}`);
        }
        let off = 0;
        lines.forEach((line, li) => {
          let s = -1;
          for (let i = 0; i <= line.length; i++) {
            const on = i < line.length && marked[off + i];
            if (on && s < 0) s = i;
            if (!on && s >= 0) {
              // a centred line starts half its width left of x
              const lx = it.align === "center" ? it.x - measure(line, size, fam) / 2 : it.x;
              const x0 = lx + measure(line.slice(0, s), size, fam), x1 = lx + measure(line.slice(0, i).trimEnd(), size, fam);
              const ym = it.y + (li + 0.55) * size * LH, pen = size * 0.9, cap = pen / 2 - 3;
              const id = `${it.id}:hl${li}.${s}`;
              sk.push({ type: "line", id, x: x0 + cap, y: ym, points: [[0, 0], [Math.max(4, x1 - x0 - 2 * cap), -1]], strokeColor: MARKER, strokeWidth: pen, opacity: 50, roughness: 1, roundness: null, seed: seed(id) });
              s = -1;
            }
          }
          off += line.length + 1;
        });
      }
      const w = Math.max(...lines.map((l) => measure(l, size, fam)));
      geo[it.id] = { x: it.x, y: it.y, w, h: lines.length * size * LH, shape: "rectangle", free: true };
      // x stays the centre for centred text: Excalidraw itself shifts it left by w / 2
      sk.push({
        type: "text", id: it.id, x: it.x, y: it.y, text: full, fontSize: size, fontFamily: fam, lineHeight: LH,
        strokeColor: stroke(it.color ?? "ink"), textAlign: it.align ?? "left", angle: it.angle ?? 0, seed: seed(it.id), opacity: it.opacity ?? 100,
      });
      if (it.align === "center") geo[it.id].x = it.x - w / 2;
    },
    arrow(it) {
      const A = Array.isArray(it.from) ? null : geo[it.from], B = Array.isArray(it.to) ? null : geo[it.to];
      if ((!A && !Array.isArray(it.from)) || (!B && !Array.isArray(it.to))) throw new Error(`arrow ${it.id}: unknown end ${it.from} / ${it.to}`);
      const via = it.via ?? [];
      const aim0 = via[0] ?? (B ? (it.toSide ? side(B, it.toSide, 0) : centre(B)) : it.to);
      const aim1 = via.at(-1) ?? (A ? (it.fromSide ? side(A, it.fromSide, 0) : centre(A)) : it.from);
      const p0 = A ? (it.fromSide ? side(A, it.fromSide) : clip(A, ...aim0)) : it.from;
      const p1 = B ? (it.toSide ? side(B, it.toSide) : clip(B, ...aim1)) : it.to;
      let pts = [p0, ...via, p1];
      if (it.bend && !via.length) {
        const [mx, my] = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
        const [dx, dy] = [p1[0] - p0[0], p1[1] - p0[1]], len = Math.hypot(dx, dy);
        pts = [p0, [mx - (dy / len) * it.bend, my + (dx / len) * it.bend], p1];
      }
      const type = it.line ? "line" : "arrow";
      sk.push({
        type, id: it.id, x: p0[0], y: p0[1], points: pts.map(([x, y]) => [x - p0[0], y - p0[1]]),
        strokeColor: stroke(it.color ?? "ink"), strokeWidth: it.sw ?? 2, strokeStyle: it.dashed ? "dashed" : it.dotted ? "dotted" : "solid",
        roughness: 1, roundness: pts.length > 2 && !it.sharp ? { type: 2 } : null, seed: seed(it.id),
        ...(type === "arrow" ? { endArrowhead: it.head ?? "arrow", startArrowhead: it.both ? "arrow" : null } : {}),
        ...(type === "arrow" && A && !A.free && it.bind !== false ? { start: { id: it.from } } : {}),
        ...(type === "arrow" && B && !B.free && it.bind !== false ? { end: { id: it.to } } : {}),
        ...(it.label ? { label: { text: it.label, fontSize: it.size ?? 18, fontFamily: 5, strokeColor: stroke(it.labelColor ?? it.color ?? "ink") } } : {}),
      });
    },
    photo(it) {
      const img = images[it.file];
      if (!img) throw new Error(`photo ${it.id}: no image ${it.file}`);
      const h = it.h ?? Math.round(it.w * img.h / img.w);
      const fileId = it.file.replace(/\W/g, "_");
      files[fileId] = { id: fileId, mimeType: img.mime, dataURL: img.dataURL, created: 1 };
      geo[it.id] = { x: it.x, y: it.y, w: it.w, h, shape: "rectangle", free: true };
      sk.push({ type: "image", id: it.id, x: it.x, y: it.y, width: it.w, height: h, fileId, status: "saved", scale: [1, 1], seed: seed(it.id) });
      if (it.swatch) {
        if (it.frame !== false) sk.push({ type: "rectangle", id: `${it.id}:frame`, x: it.x - 6, y: it.y - 6, width: it.w + 12, height: h + 12, strokeColor: stroke(it.swatch), backgroundColor: "transparent", strokeWidth: 2, roughness: 1, roundness: null, seed: seed(it.id + "f") });
        const cy = it.y + h + 18;
        sk.push({ type: "rectangle", id: `${it.id}:swatch`, x: it.x - 4, y: cy, width: 22, height: 22, strokeColor: stroke(it.swatch), backgroundColor: fill(it.swatch), fillStyle: "solid", strokeWidth: 2, roughness: 1, roundness: null, seed: seed(it.id + "s") });
        if (it.caption) H.text({ id: `${it.id}:caption`, x: it.x + 28, y: cy - 2, text: it.caption, size: it.capSize ?? 18, w: it.capW ?? it.w - 28, color: "ink" });
        geo[it.id + ":all"] = { x: it.x - 6, y: it.y - 6, w: it.w + 12, h: h + 50, shape: "rectangle", free: true };
      }
    },
    // a formula, rendered from TeX in Node (tex.mjs) and placed like a photo; customData.tex keeps its source
    tex(it) {
      const img = images[`tex|${it.size ?? 24}|${it.color ?? "ink"}|${it.tex}`]; // tex.mjs's texKey
      if (!img) throw new Error(`tex ${it.id}: not rendered`);
      const x = it.align === "center" ? it.x - img.w / 2 : it.x;
      files[img.fileId] = { id: img.fileId, mimeType: img.mime, dataURL: img.dataURL, created: 1 };
      geo[it.id] = { x, y: it.y, w: img.w, h: img.h, shape: "rectangle", free: true };
      sk.push({ type: "image", id: it.id, x, y: it.y, width: img.w, height: img.h, fileId: img.fileId, status: "saved", scale: [1, 1], seed: seed(it.id), customData: { tex: it.tex } });
    },
    code(it) {
      const size = it.size ?? 16, cw = measure("M", size, 3), lh = size * 1.45, pad = 16;
      const lines = it.code.replace(/\n$/, "").split("\n");
      const w = it.w ?? Math.max(...lines.map((l) => l.length)) * cw + pad * 2;
      const h = lines.length * lh + pad * 2;
      const gid = it.id;
      groups[gid] = true;
      geo[it.id] = { x: it.x, y: it.y, w, h, shape: "rectangle", free: true };
      sk.push({ type: "rectangle", id: `${it.id}:bg`, x: it.x, y: it.y, width: w, height: h, strokeColor: stroke(it.color ?? "violet"), backgroundColor: it.bg ?? "#f3f0ff", fillStyle: "solid", strokeWidth: 2, roughness: 1, roundness: { type: 3 }, seed: seed(it.id), groupIds: [gid] });
      if (it.title) {
        const tw = measure(it.title, 16, 3) + 24;
        sk.push({ type: "rectangle", id: `${it.id}:tab`, x: it.x + 14, y: it.y - 16, width: tw, height: 30, strokeColor: stroke(it.color ?? "violet"), backgroundColor: fill(it.color ?? "violet"), fillStyle: "solid", strokeWidth: 2, roughness: 1, roundness: { type: 3 }, seed: seed(it.id + "tab"), groupIds: [gid] });
        sk.push({ type: "text", id: `${it.id}:title`, x: it.x + 26, y: it.y - 16 + 15 - 16 * 0.6, text: it.title, fontSize: 16, fontFamily: 3, lineHeight: 1.2, strokeColor: stroke(it.color ?? "violet"), seed: seed(it.id + "tt"), groupIds: [gid] });
      }
      lines.forEach((line, li) => {
        let col = 0;
        tokenize(line, it.lang ?? "sh").forEach((tok, ti) => {
          if (/\S/.test(tok.text)) {
            const id = `${it.id}:${li}.${ti}`;
            sk.push({ type: "text", id, x: it.x + pad + col * cw, y: it.y + pad + li * lh, text: tok.text, fontSize: size, fontFamily: 3, lineHeight: 1.2, strokeColor: tok.colour ? stroke(tok.colour) : "#1e1e1e", seed: seed(id), groupIds: [gid] });
          }
          col += tok.text.length;
        });
      });
    },
    heading(it) {
      // an ellipse's label area is about 70% of it, so 56 px holds one line; two digits get a smaller font
      const r = 28, n = String(it.n);
      sk.push({ type: "ellipse", id: `${it.id}:n`, x: it.x, y: it.y, width: r * 2, height: r * 2, strokeColor: stroke(it.color ?? "ink"), backgroundColor: fill(it.color ?? "yellow"), fillStyle: "solid", strokeWidth: 2, roughness: 1, seed: seed(it.id + "n"), label: { text: n, fontSize: n.length > 1 ? 20 : 24, fontFamily: 5, strokeColor: stroke("ink") } });
      H.text({ id: it.id, x: it.x + r * 2 + 14, y: it.y + r - (it.size ?? 32) * LH / 2, text: it.text, size: it.size ?? 32 });
    },
    wifi(it) {
      const n = it.n ?? 3, r0 = it.r0 ?? 14, dr = it.dr ?? 12, spread = ((it.spread ?? 80) * Math.PI) / 180, a = ((it.dir ?? -90) * Math.PI) / 180;
      for (let k = 0; k < n; k++) {
        const r = r0 + k * dr, id = `${it.id}:${k}`;
        const pts = [a - spread / 2, a, a + spread / 2].map((t) => [it.x + r * Math.cos(t), it.y + r * Math.sin(t)]);
        sk.push({ type: "line", id, x: pts[0][0], y: pts[0][1], points: pts.map(([x, y]) => [x - pts[0][0], y - pts[0][1]]), strokeColor: stroke(it.color ?? "red"), strokeWidth: it.sw ?? 2.5, roughness: 1, roundness: { type: 2 }, seed: seed(id) });
      }
    },
    poly(it) {
      const p = it.points, closed = it.closed;
      const pts = closed ? [...p, p[0]] : p;
      sk.push({ type: "line", id: it.id, x: pts[0][0], y: pts[0][1], points: pts.map(([x, y]) => [x - pts[0][0], y - pts[0][1]]), strokeColor: stroke(it.color ?? "ink"), backgroundColor: it.fill ? fill(it.fill) : "transparent", fillStyle: it.hatch ? "hachure" : "solid", strokeWidth: it.sw ?? 2, strokeStyle: it.dashed ? "dashed" : "solid", roughness: it.rough ?? 1, roundness: it.smooth ? { type: 2 } : null, seed: seed(it.id) });
      const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
      geo[it.id] = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), shape: "rectangle", free: true };
    },
    cloud(it) {
      const k = it.bumps ?? 9, cx = it.x + it.w / 2, cy = it.y + it.h / 2, pts = [], n = k * 8;
      for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2, r = 0.84 + 0.16 * Math.abs(Math.sin((k * t) / 2));
        pts.push([cx + (it.w / 2) * r * Math.cos(t), cy + (it.h / 2) * r * Math.sin(t)]);
      }
      H.poly({ id: it.id, points: pts, closed: true, color: it.color, fill: it.fill ?? it.color, hatch: it.hatch, sw: it.sw });
      geo[it.id] = { x: it.x, y: it.y, w: it.w, h: it.h, shape: "ellipse", free: true };
      if (it.label) H.text({ id: `${it.id}:label`, x: cx, y: cy - ((it.size ?? 22) * LH * it.label.split("\n").length) / 2, text: it.label, size: it.size ?? 22, align: "center" });
    },
  };

  for (const it of spec.items) {
    if (!H[it.t]) throw new Error(`unknown item type ${it.t}`);
    H[it.t](it);
  }
  // A link goes on every element of its item, so any part of it can be clicked; a bound label inherits its box's.
  for (const it of spec.items) if (it.link) for (const e of sk) if (e.id === it.id || e.id.startsWith(it.id + ":")) e.link = it.link;

  const els = convertToExcalidrawElements(sk, { regenerateIds: false });
  // Deterministic: name bound labels after their containers, fix nonces, versions and timestamps.
  const rename = {};
  for (const e of els) if (e.containerId && !e.id.includes(":")) rename[e.id] = `${e.containerId}:label`;
  const out = els.map((e) => {
    const n = { ...e, id: rename[e.id] ?? e.id, versionNonce: hash(e.id + "v"), updated: 1, version: 1 };
    if (n.boundElements) n.boundElements = n.boundElements.map((b) => ({ ...b, id: rename[b.id] ?? b.id }));
    if (rename[e.id]) n.seed = hash(n.id);
    return n;
  });
  return { type: "excalidraw", version: 2, source: "excalidraw-deck", elements: out, appState: { viewBackgroundColor: "#ffffff", gridSize: 20 }, files };
}

const PAD = 16;

// opts.elements: export only these (one section of a board).
// opts.mark: wrap each element's nodes in <g data-id> (and data-link when it has a link), so a page script can find
//   them. Excalidraw's export keeps no ids; it only wraps a linked element in <a href>, so every element gets a
//   throwaway link "#hc/<id>" for the export, and the <a>s become <g>s.
// opts.span: [x0, x1] in scene coordinates; widen the viewBox to it, so sections of one board share a scale.
// opts.frame: [w, h]: the viewBox is exactly the scene rectangle (0, 0)–(w, h), so every slide shares one canvas.
// opts.fontSuffix: rename the embedded font families. Each SVG embeds its own subset of a font, and two subsets
//   under one name clash on a page.
export async function toSvg(scene, background = false, opts = {}) {
  const own = opts.elements ?? scene.elements;
  const elements = opts.mark ? own.map((e) => ({ ...e, link: "#hc/" + e.id })) : own;
  const svg = await exportToSvg({
    elements,
    appState: { ...scene.appState, exportBackground: background, exportWithDarkMode: false },
    files: scene.files,
    exportPadding: PAD,
  });
  if (opts.mark) {
    const links = new Map(own.filter((e) => e.link).map((e) => [e.id, e.link]));
    for (const a of [...svg.querySelectorAll('a[href^="#hc/"]')]) {
      const id = a.getAttribute("href").slice(4), g = document.createElementNS(a.namespaceURI, "g");
      g.setAttribute("data-id", id);
      const link = links.get(id) ?? links.get(id.split(":")[0]);
      if (link) g.setAttribute("data-link", link);
      g.append(...a.childNodes);
      a.replaceWith(g);
    }
  }
  if (opts.span) {
    const [x0] = getCommonBounds(own), [, y, , h] = svg.getAttribute("viewBox").split(" ").map(Number);
    const w = opts.span[1] - opts.span[0] + 2 * PAD;
    svg.setAttribute("viewBox", `${opts.span[0] - x0} ${y} ${w} ${h}`);
    svg.setAttribute("width", w);
  }
  if (opts.frame) {
    const [x0, y0] = getCommonBounds(own), [w, h] = opts.frame;
    svg.setAttribute("viewBox", `${PAD - x0} ${PAD - y0} ${w} ${h}`);
    svg.setAttribute("width", w);
    svg.setAttribute("height", h);
  }
  const html = svg.outerHTML;
  return opts.fontSuffix ? html.replace(/\b(Excalifont|Cascadia|Nunito|Xiaolai)\b/g, `$1-${opts.fontSuffix}`) : html;
}
