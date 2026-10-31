// The deck's runtime: one slide on screen, sketched in as it enters; steps reveal items (drawn stroke by stroke),
// send a dot along arrows, dim and spotlight; ← → / space / click move through steps, then slides.
// Reads window.DECK. Plain JS, no modules.
(() => {
  const D = window.DECK, NS = "http://www.w3.org/2000/svg";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const slides = $$(".slide").map((el) => ({ el, i: +el.dataset.i, svg: $(".stage > svg", el), def: D.slides[+el.dataset.i] }));
  // an item's groups: the element and its parts ("<id>:label", "<id>:hl0.3", a code block's tokens "<id>:2.1", …)
  const parts = (s, id) => { const full = `s${s.i}-${id}`; return $$("g[data-id]", s.svg).filter((g) => g.dataset.id === full || g.dataset.id.startsWith(full + ":")); };
  const part = (s, id) => s.svg.querySelector(`g[data-id="s${s.i}-${id}"]`);
  const toRoot = (svg, node) => svg.getScreenCTM().inverse().multiply(node.getScreenCTM());
  const toast = (() => { const el = $(".toast"); let t; return (m) => { el.textContent = m; el.hidden = false; clearTimeout(t); t = setTimeout(() => (el.hidden = true), 2400); }; })();
  for (const s of slides) {
    s.svg.removeAttribute("width"); s.svg.removeAttribute("height");
    s.hidden = new Set(s.def.steps.flatMap((st) => st.show ?? []));
  }

  // ── drawing in ──────────────────────────────────────────────────────
  // Strokes draw along their path, fills and text fade up after them, highlighter marks swipe on last.
  function sketchIn(gs, t0 = 0, per = 90, span = 1400) {
    if (reduce) return;
    const step = gs.length > 1 ? Math.min(per, span / gs.length) : 0;
    gs.forEach((g, n) => {
      const delay = t0 + n * step, mark = g.dataset.id.includes(":hl");
      const strokes = $$("path", g).filter((p) => p.getAttribute("stroke") && p.getAttribute("stroke") !== "none" && !p.getAttribute("stroke-dasharray") && (p.getAttribute("fill") ?? "none") === "none");
      for (const p of strokes) {
        const len = p.getTotalLength();
        p.animate([{ strokeDasharray: `${len} ${len}`, strokeDashoffset: len }, { strokeDasharray: `${len} ${len}`, strokeDashoffset: 0 }],
          { duration: mark ? 380 : clamp(len * 1.1, 260, 700), delay: delay + (mark ? 300 : 0), easing: "ease-out", fill: "backwards" });
      }
      const rest = $$("path, text, use, image", g).filter((x) => !strokes.includes(x));
      for (const x of rest) x.animate([{ opacity: 0, transform: x.tagName === "text" ? "translateY(6px)" : "none" }, { opacity: 1, transform: "none" }],
        { duration: 380, delay: delay + (strokes.length ? 220 : 0), easing: "ease-out", fill: "backwards" });
    });
  }

  // ── a dot along arrows ──────────────────────────────────────────────
  function probe(s, id) {
    const g = part(s, id), shaft = g && $("path", g);
    if (!shaft) { console.warn(`trip: no arrow ${id}`); return null; }
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", shaft.getAttribute("d").split(/(?=M)/)[0]);
    p.setAttribute("class", "trail");
    shaft.parentNode.append(p);
    return { p, m: toRoot(s.svg, p), len: p.getTotalLength() };
  }
  async function trip(s, ids, token) {
    let dot = $(".dot", s.svg);
    if (!dot) { dot = document.createElementNS(NS, "g"); dot.setAttribute("class", "dot"); dot.innerHTML = `<circle r="11"/>`; s.svg.append(dot); }
    for (const id of ids) {
      const pr = probe(s, id);
      if (!pr) continue;
      pr.p.style.strokeDasharray = `${pr.len} ${pr.len + 2}`;
      await new Promise((done) => {
        const t0 = performance.now(), ms = reduce ? 0 : clamp(pr.len * 2.2, 500, 1400);
        const tick = (now) => {
          if (cur.token !== token) return done();
          const u = ms ? Math.min(1, (now - t0) / ms) : 1, e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
          pr.p.style.strokeDashoffset = pr.len * (1 - e);
          const q = pr.p.getPointAtLength(e * pr.len).matrixTransform(pr.m);
          dot.setAttribute("transform", `translate(${q.x} ${q.y})`);
          u < 1 ? requestAnimationFrame(tick) : done();
        };
        requestAnimationFrame(tick);
      });
    }
  }
  const pulse = (gs) => { if (reduce) return; for (const g of gs) { g.style.transformBox = "fill-box"; g.style.transformOrigin = "center"; g.animate([{ transform: "scale(1)" }, { transform: "scale(1.07)" }, { transform: "scale(1)" }], { duration: 560, easing: "ease-out" }); } };

  // ── state: slide i, step k (0 = before any step) ────────────────────
  const cur = { i: -1, k: 0, token: 0 };
  // the slide as it stands after k steps, with no animation
  function settle(s, k) {
    $$(".trail, .dot", s.svg).forEach((x) => x.remove());
    $$("g.off, g.dim, g.lit, g.glow", s.svg).forEach((g) => g.classList.remove("off", "dim", "lit", "glow"));
    const shown = new Set(s.def.steps.slice(0, k).flatMap((st) => st.show ?? []));
    for (const id of s.hidden) if (!shown.has(id)) parts(s, id).forEach((g) => g.classList.add("off"));
    const st = s.def.steps[k - 1];
    if (!st) return;
    for (const id of st.dim ?? []) parts(s, id).forEach((g) => g.classList.add("dim"));
    for (const id of st.focus ? [].concat(st.focus) : []) parts(s, id).forEach((g) => g.classList.add("glow"));
    for (const id of st.lit ?? []) parts(s, id).forEach((g) => g.classList.add("lit"));
  }
  function caption(text) { const el = $(".say"); el.textContent = text ?? ""; el.hidden = !text; }
  function hud() {
    const s = slides[cur.i], n = s.def.steps.length;
    $(".hud .n").textContent = `${cur.i + 1} / ${slides.length}` + (n ? `  ·  ${cur.k}/${n}` : "");
    $(".progress i").style.width = `${((cur.i + (n ? cur.k / n : 1)) / slides.length) * 100}%`;
    $(".notes").textContent = s.def.notes;
    if (location.hash !== `#${cur.i + 1}`) history.replaceState(null, "", `#${cur.i + 1}`);
  }

  function show(i, k = 0, dir = 1) {
    i = clamp(i, 0, slides.length - 1);
    const s = slides[i], token = ++cur.token, enter = i !== cur.i;
    if (enter) {
      slides.forEach((x) => x.el.classList.toggle("on", x === s));
      if (!reduce) s.el.animate([{ opacity: 0, transform: `translateX(${dir * 40}px)` }, { opacity: 1, transform: "none" }], { duration: 420, easing: "ease-out" });
    }
    cur.i = i; cur.k = k;
    settle(s, k);
    caption(s.def.steps[k - 1]?.say);
    hud();
    if (enter && s.def.enter === "draw" && dir > 0) sketchIn($$("g[data-id]", s.svg).filter((g) => !g.classList.contains("off") && !g.parentElement.closest("g[data-id]")));
    return { s, token };
  }
  async function next() {
    const s = slides[cur.i];
    if (cur.k >= s.def.steps.length) return cur.i < slides.length - 1 && show(cur.i + 1, 0, 1);
    const st = s.def.steps[cur.k], { token } = show(cur.i, cur.k + 1, 0);
    const shown = (st.show ?? []).map((id) => parts(s, id));
    shown.forEach((gs, n) => sketchIn(gs.sort((a, b) => a.dataset.id.includes(":hl") - b.dataset.id.includes(":hl")), n * 160, 40));
    pulse((st.pulse ?? []).flatMap((id) => parts(s, id)));
    if (st.trip) await trip(s, [].concat(st.trip), token);
  }
  function prev() {
    if (cur.k > 0) return show(cur.i, cur.k - 1, 0);
    if (cur.i > 0) show(cur.i - 1, slides[cur.i - 1].def.steps.length, -1);
  }

  // ── copy the slide into Excalidraw ──────────────────────────────────
  async function copy() {
    const s = slides[cur.i], data = JSON.parse($("script.els", s.el).textContent);
    for (const id of Object.keys(data.files)) data.files[id].dataURL = $(`symbol[id="image-${id}"] image`, s.svg)?.getAttribute("href");
    const text = JSON.stringify({ type: "excalidraw/clipboard", elements: data.elements, files: data.files });
    try { await navigator.clipboard.writeText(text); } catch { const ta = Object.assign(document.createElement("textarea"), { value: text }); document.body.append(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
    toast(`Copied ${data.elements.length} elements: paste into Excalidraw`);
  }

  // ── controls ────────────────────────────────────────────────────────
  const dark = (on) => { document.body.classList.toggle("dark", on); try { localStorage.setItem("deck-dark", on ? "1" : ""); } catch {} };
  try { if (localStorage.getItem("deck-dark")) dark(true); } catch {}
  function overview(on) {
    document.body.classList.toggle("overview", on);
    if (on) slides.forEach((s) => settle(s, s.def.steps.length));
    else show(cur.i, cur.k, 0);
  }
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (document.body.classList.contains("overview") && !"oO".includes(k) && k !== "Escape") return;
    if (["ArrowRight", "ArrowDown", " ", "PageDown", "Enter"].includes(k)) { e.preventDefault(); next(); }
    else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) { e.preventDefault(); prev(); }
    else if (k === "Home") show(0);
    else if (k === "End") show(slides.length - 1, slides.at(-1).def.steps.length);
    else if (k === "f" || k === "F") document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    else if (k === "d" || k === "D") dark(!document.body.classList.contains("dark"));
    else if (k === "o" || k === "O" || (k === "Escape" && document.body.classList.contains("overview"))) overview(!document.body.classList.contains("overview"));
    else if (k === "c" || k === "C") copy();
    else if (k === "n" || k === "N") $(".notes").hidden = !$(".notes").hidden;
  });
  addEventListener("click", (e) => {
    const card = e.target.closest(".slide");
    if (document.body.classList.contains("overview")) { if (card) { document.body.classList.remove("overview"); show(+card.dataset.i, 0, 1); } return; }
    if (e.target.closest("a, button, .notes")) return;
    e.clientX < innerWidth / 4 ? prev() : next();
  });
  addEventListener("hashchange", () => { const n = parseInt(location.hash.slice(1)) - 1; if (n >= 0 && n !== cur.i) show(n); });

  const start = clamp((parseInt(location.hash.slice(1)) || 1) - 1, 0, slides.length - 1);
  show(start, 0, 1);
  window.DECKUI = { show, next, prev, cur, slides };
})();
