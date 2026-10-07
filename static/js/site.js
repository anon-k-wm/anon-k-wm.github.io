/* k-WM project page. Everything here is an enhancement: without scripts the page is a one-column article
   with the appendix at the bottom. Sections: math · outline · rows · sheets · scrollspy · videos. */
(() => {
  "use strict";
  const $ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const rail = window.matchMedia("(min-width: 1400px)");   // the text column is showing; mirrors style.css

  // ── Math ──
  if (window.renderMathInElement) {
    renderMathInElement(document.body, {
      delimiters: [{ left: "\\[", right: "\\]", display: true }, { left: "\\(", right: "\\)", display: false }],
      throwOnError: false,
    });
  }
  // Keep punctuation attached to the inline math it follows or opens, so a line never starts with a comma.
  for (let k of $("p .katex, li .katex, figcaption .katex")) {
    if (k.closest(".katex-display")) continue;
    if (k.parentNode.tagName === "SPAN" && k.parentNode.childNodes.length === 1) k = k.parentNode;   // auto-render's wrapper
    const next = k.nextSibling, prev = k.previousSibling;
    const after = next && next.nodeType === 3 ? (next.nodeValue.match(/^[,.;:)\]]+/) || [""])[0] : "";
    const before = prev && prev.nodeType === 3 ? (prev.nodeValue.match(/[(\[]$/) || [""])[0] : "";
    if (!after && !before) continue;
    const wrap = document.createElement("span");
    wrap.className = "nw";
    k.before(wrap);
    if (before) { prev.nodeValue = prev.nodeValue.slice(0, -before.length); wrap.append(before); }
    wrap.append(k);
    if (after) { next.nodeValue = next.nodeValue.slice(after.length); wrap.append(after); }
  }

  // ── Outline: the menu button on narrow screens ──
  const sidenav = document.querySelector(".sidenav");
  const toggle = sidenav.querySelector(".nav-toggle");
  toggle.addEventListener("click", () => {
    toggle.setAttribute("aria-expanded", sidenav.classList.toggle("open"));
  });

  // ── Rows: a figure and its note, side by side on wide screens ──
  // Whichever side of a row is shorter sticks while the other scrolls past; a side taller than the window
  // sticks by its bottom edge instead. A text much longer than its figure becomes a box of the figure's height
  // (or most of the window, when the figure is short) that scrolls on its own, fading at the edge that has more.
  const STICK = 32;     // px between a sticky side and the window edge
  const SLACK = 200;    // px a text may run past the box height before it is boxed
  const MIN_BOX = 0.8;  // of the window height
  const rows = $("main .row").map((row) => ({
    fig: row.querySelector(".fig"), note: row.querySelector(".note"), body: row.querySelector(".note-body"),
  }));
  const edges = (body) => {
    body.classList.toggle("more-below", body.scrollTop + body.clientHeight < body.scrollHeight - 1);
    body.classList.toggle("more-above", body.scrollTop > 1);
  };
  const fit = () => {
    const vh = window.innerHeight;
    for (const { fig, note, body } of rows) {
      const room = Math.max(fig.offsetHeight, Math.round(MIN_BOX * vh)) - (note.offsetHeight - body.offsetHeight);
      body.style.setProperty("--note-max", body.scrollHeight > room + SLACK ? `${room}px` : "100vh");
      for (const el of [fig, note]) el.style.setProperty("--stick", `${Math.min(STICK, vh - el.offsetHeight - STICK)}px`);
      edges(body);
    }
  };
  for (const { body } of rows) body.addEventListener("scroll", () => edges(body), { passive: true });
  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(fit);
    for (const { fig, note, body } of rows) [fig, note, body].forEach((el) => ro.observe(el));
  }
  window.addEventListener("resize", fit);
  window.addEventListener("load", fit);
  if (document.fonts) document.fonts.ready.then(fit);

  // ── Sheets: panels that slide in from the right. The appendix is always one; a note is one only while
  //    there is no text column, and opens from its "Read the text" button. One sheet is open at a time. ──
  const appendix = document.getElementById("appendix");
  const appendixBody = appendix.querySelector(".sheet-body");
  const parts = $(".app", appendix);
  const sheetNotes = rows.map((r) => r.note).filter((n) => !n.matches(".dup"));   // a dup note has no button
  let sheet = null, lastFocus = null;

  for (const [el, label] of [[appendix, "Appendix"], ...sheetNotes.map((n) => [n, "Paper text"])]) {
    const bar = document.createElement("div");
    bar.className = "sheet-bar";
    bar.innerHTML = `<span>${label}</span><button type="button">Close</button>`;
    el.prepend(bar);
  }
  const setMode = () => { for (const n of sheetNotes) n.classList.toggle("sheet", !rail.matches); };

  // Previous / next links at the foot of each appendix section, so it can be read straight through
  parts.forEach((part, i) => {
    const foot = document.createElement("nav");
    foot.className = "app-foot";
    foot.setAttribute("aria-label", "Previous and next");
    for (const [other, cls, word] of [[parts[i - 1], "prev", "Previous"], [parts[i + 1], "next", "Next"]]) {
      const el = document.createElement(other ? "a" : "span");
      el.className = cls;
      if (other) { el.href = `#${other.id}`; el.innerHTML = `<small>${word}</small>${other.querySelector("h2").innerHTML}`; }
      foot.append(el);
    }
    part.append(foot);
  });

  // Which sheet, if any, a link to `id` opens
  const sheetFor = (id) => {
    const el = id && document.getElementById(id);
    if (!el) return null;
    return el.closest(".app") ? appendix : el.closest(".note.sheet");
  };
  const mark = (id) => {   // the open sheet's entry in the outline, or its button
    for (const a of $(".sidenav a[data-app]")) a.classList.toggle("current", sheet === appendix && a.hash === `#${id}`);
    for (const a of $("a.more")) {
      if (sheet && a.hash === `#${id}`) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    }
  };
  const setHash = (id, push) => {
    try { history[push ? "pushState" : "replaceState"](null, "", id ? `#${id}` : location.pathname + location.search); } catch (e) {}
  };
  const open = (id) => {
    const target = document.getElementById(id);
    const s = sheetFor(id);
    if (!s) return false;
    if (sheet && sheet !== s) shut(true);
    if (!sheet) lastFocus = document.activeElement;
    if (s === appendix) {
      const part = target.closest(".app");
      for (const p of parts) p.classList.toggle("open", p === part);
      appendixBody.scrollTop = target === part ? 0 : target.offsetTop - 16;
    } else {
      s.querySelector(".note-body").scrollTop = 0;
    }
    s.classList.add("open");
    sheet = s;
    mark(id);
    s.querySelector(".sheet-bar button").focus({ preventScroll: true });
    return true;
  };
  const shut = (quiet) => {
    if (!sheet) return;
    sheet.classList.remove("open");
    sheet = null;
    mark(null);
    if (!quiet && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  };
  const close = () => { shut(); setHash("", false); };

  document.addEventListener("click", (e) => {
    if (e.target.closest(".sheet-bar button")) return close();
    const a = e.target.closest('a[href^="#"]');
    // a click outside the open sheet closes it, except on a control (e.g. the video pickers) or at the end of a text selection
    if (!a) {
      if (sheet && !sheet.contains(e.target) && !e.target.closest("button, input, select, textarea, label, video")
          && !String(getSelection())) close();
      return;
    }
    const id = a.hash.slice(1);
    sidenav.classList.remove("open");
    if (!sheetFor(id)) {
      if (sheet) shut(true);   // a link to the page proper closes the sheet
      return;
    }
    e.preventDefault();
    // a second click on the button or the outline entry that opened the sheet closes it
    if (a.classList.contains("more") && a.hasAttribute("aria-current")) return close();
    if (a.matches(".sidenav a[data-app].current")) return close();
    open(id);
    setHash(id, true);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && sheet) close(); });
  const fromHash = () => {   // back and forward step through what was opened
    const id = location.hash.slice(1);
    if (!open(id) && sheet && !document.getElementById(id)) shut();
  };
  window.addEventListener("popstate", fromHash);
  rail.addEventListener("change", () => {
    if (sheet && sheet !== appendix) close();
    setMode();
    fit();
  });
  setMode();
  fit();
  fromHash();

  // ── Scrollspy: highlight the section in view in the outline ──
  const links = new Map($(".sidenav a:not([data-app])").map((a) => [a.hash.slice(1), a]));
  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        for (const a of links.values()) a.classList.toggle("current", a === links.get(en.target.id));
      }
    }, { rootMargin: "-20% 0px -70% 0px" });
    for (const id of links.keys()) { const el = document.getElementById(id); if (el) spy.observe(el); }
  }

  // ── Videos. A .slot shows its clip once the file exists, and until then a labelled placeholder (or the
  //    paper's still beside it). Planning slots name their file from the environment, the chosen model class
  //    and planner, and their kind (start, goal, k1, k8); the rollout slots carry data-src. File names: static/videos/README.txt. ──
  const pickers = [document.getElementById("model-picker"), document.getElementById("planner-picker")];
  const chosen = (p) => Object.values(p.querySelector('[aria-pressed="true"]').dataset)[0];
  const planningSrc = (slot) => {
    const { env, kind } = slot.dataset;
    const ext = kind === "start" || kind === "goal" ? "png" : "mp4";
    return `static/videos/planning/${env}_${chosen(pickers[0])}_${kind}_${chosen(pickers[1])}.${ext}`;
  };
  const loadSlot = (slot) => {
    const src = slot.dataset.env ? planningSrc(slot) : slot.dataset.src;
    slot.dataset.src = src;
    const old = slot.querySelector("video, img");
    if (old) old.remove();
    const empty = slot.querySelector(".empty");
    if (empty) { empty.hidden = false; empty.querySelector("code").textContent = src; }
    const still = src.endsWith(".png");
    const v = document.createElement(still ? "img" : "video");
    if (still) v.alt = `${slot.dataset.kind} frame`;
    else Object.assign(v, { muted: true, loop: true, autoplay: true, playsInline: true, controls: true, preload: "metadata" });
    v.addEventListener(still ? "load" : "loadeddata", () => {
      if (slot.dataset.src !== src) return;   // the selection changed while this clip was loading
      if (empty) empty.hidden = true;
      slot.hidden = false;
      slot.append(v);
      if (slot.dataset.still) document.getElementById(slot.dataset.still).hidden = true;
    });
    v.src = src;
  };
  $(".slot").forEach(loadSlot);
  for (const picker of pickers) picker.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    for (const x of picker.querySelectorAll("button")) x.setAttribute("aria-pressed", x === b);
    $(".slot[data-env]").forEach(loadSlot);
  });
})();
