// js/measure.ts
var LINE_GAP = 0.4;
var TOPS = ["ascender", "cap-height", "x-height"];
var BOTTOMS = ["baseline", "descender"];
var TEXT_TOP = "ascender";
var TEXT_BOTTOM = "descender";
var SKIP = /* @__PURE__ */ new Set(["script", "style", "template", "noscript"]);
var HINT_BLOCK = "skullet-block";
var HINT_IGNORE = "skullet-ignore";
var MEDIA = /* @__PURE__ */ new Set([
  "audio",
  "canvas",
  "embed",
  "iframe",
  "img",
  "input",
  "object",
  "picture",
  "select",
  "svg",
  "textarea",
  "video"
]);
var BORDER_SIDES = ["Top", "Right", "Bottom", "Left"];
function measure(contentEl, originEl) {
  const origin = originEl.getBoundingClientRect();
  const range = document.createRange();
  const candidates = [];
  const blocks = [];
  const walker = document.createTreeWalker(
    contentEl,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT
  );
  const styles = /* @__PURE__ */ new Map();
  let skipped = null;
  let node = walker.nextNode();
  while (node) {
    if (skipped && skipped.contains(node)) {
      node = walker.nextNode();
      continue;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (parent && node.textContent?.trim()) {
        const box = parent.getBoundingClientRect();
        if (box.width > 2 || box.height > 2) {
          range.selectNodeContents(node);
          const rects = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0).map((rect) => relative(rect, origin));
          if (rects.length > 0) candidates.push(...toLines(rects, parent, styles));
        }
      }
    } else {
      const element = node;
      if (element.hasAttribute(HINT_IGNORE)) {
        skipped = element;
      } else if (element.hasAttribute(HINT_BLOCK)) {
        blocks.push(toRect(element.getBoundingClientRect(), origin));
        skipped = element;
      } else if (SKIP.has(element.localName)) {
        skipped = element;
      } else if (isSkeleton(element)) {
        blocks.push(toRect(element.getBoundingClientRect(), origin));
        skipped = element;
      } else if (MEDIA.has(element.localName) || isPainted(element, styles)) {
        blocks.push(toRect(element.getBoundingClientRect(), origin));
      }
    }
    node = walker.nextNode();
  }
  return { lines: mergeLines(candidates), blocks };
}
function mergeLines(candidates) {
  const lines = [];
  for (const candidate of [...candidates].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const last = lines[lines.length - 1];
    if (last && sharesLine(last, candidate, Math.min(last.fontSize, candidate.fontSize) * LINE_GAP)) {
      const left = Math.min(last.x, candidate.x);
      const right = Math.max(last.x + last.width, candidate.x + candidate.width);
      const top = Math.min(last.y, candidate.y);
      const bottom = Math.max(last.y + last.height, candidate.y + candidate.height);
      last.x = left;
      last.y = top;
      last.width = right - left;
      last.height = bottom - top;
    } else {
      lines.push({ ...candidate });
    }
  }
  return lines;
}
function sharesLine(a, b, gap) {
  const overlap = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  if (overlap < Math.min(a.height, b.height) / 2) return false;
  const distance = Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width);
  return distance <= gap;
}
function toLines(rects, parent, styles) {
  const style = styleOf(parent, styles);
  const fontSize = Number.parseFloat(style.fontSize) || 16;
  const font = [style.fontStyle, style.fontWeight, style.fontSize, style.fontFamily].join(" ");
  const textTop = oneOf(style.getPropertyValue("--skullet-text-top").trim(), TOPS, TEXT_TOP);
  const textBottom = oneOf(
    style.getPropertyValue("--skullet-text-bottom").trim(),
    BOTTOMS,
    TEXT_BOTTOM
  );
  return rects.map((rect) => ({
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
    font,
    fontSize,
    textTop,
    textBottom
  }));
}
function oneOf(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}
function isSkeleton(element) {
  return element.getAttribute("phx-hook") === "Skullet" || element.classList.contains("skullet");
}
function styleOf(element, styles) {
  const cached = styles.get(element);
  if (cached) return cached;
  const style = getComputedStyle(element);
  styles.set(element, style);
  return style;
}
function isPainted(element, styles) {
  const style = styleOf(element, styles);
  const background = style.backgroundColor;
  const painted = background !== "" && background !== "transparent" && !/[,/]\s*0\)$/.test(background);
  return painted || style.backgroundImage !== "" && style.backgroundImage !== "none" || style.boxShadow !== "" && style.boxShadow !== "none" || BORDER_SIDES.every(
    (side) => style.getPropertyValue(`border-${side.toLowerCase()}-style`) !== "none" && style.getPropertyValue(`border-${side.toLowerCase()}-width`) !== "0px"
  );
}
function relative(rect, origin) {
  return {
    left: rect.left - origin.left,
    top: rect.top - origin.top,
    width: rect.width,
    height: rect.height
  };
}
function toRect(rect, origin) {
  return {
    x: rect.left - origin.left,
    y: rect.top - origin.top,
    width: rect.width,
    height: rect.height
  };
}

// js/metrics.ts
var context;
var byFont = /* @__PURE__ */ new Map();
function textContext() {
  if (context === void 0) {
    const canvas = typeof document === "undefined" ? null : document.createElement("canvas");
    context = canvas ? canvas.getContext("2d") : null;
  }
  return context;
}
function metricsOf(font) {
  if (byFont.has(font)) return byFont.get(font) ?? null;
  const canvas = textContext();
  let metrics = null;
  if (canvas) {
    canvas.font = font;
    const box = canvas.measureText("H");
    const ink = (text) => canvas.measureText(text).actualBoundingBoxAscent;
    const ascent = box.fontBoundingBoxAscent;
    const descent = box.fontBoundingBoxDescent;
    if (Number.isFinite(ascent) && Number.isFinite(descent) && ascent + descent > 0) {
      metrics = {
        ascent,
        descent,
        ascender: ink("bdfhkl"),
        capHeight: box.actualBoundingBoxAscent,
        xHeight: ink("xz"),
        descender: canvas.measureText("gjpqy").actualBoundingBoxDescent
      };
    }
  }
  byFont.set(font, metrics);
  return metrics;
}
function inkAbove(rule, metrics) {
  if (rule === "cap-height") return metrics.capHeight;
  if (rule === "x-height") return metrics.xHeight;
  return metrics.ascender;
}
function barBox(line) {
  const metrics = metricsOf(line.font);
  if (!metrics) {
    const height = Math.min(line.fontSize * 0.72, line.height);
    return { y: line.y + (line.height - height) / 2, height };
  }
  const box = metrics.ascent + metrics.descent;
  const baseline = line.y + (line.height - box) / 2 + metrics.ascent;
  const top = baseline - inkAbove(line.textTop, metrics);
  const bottom = baseline + (line.textBottom === "descender" ? metrics.descender : 0);
  return { y: top, height: Math.max(bottom - top, 1) };
}
function resetFontCache() {
  byFont.clear();
  context = void 0;
}

// js/reveal.ts
var DEFAULT_DURATIONS = { hold: 150, fade: 200, resize: 280, sequence: 320 };
var LONGEST_MS = 5e3;
function durationsOf(element) {
  const style = getComputedStyle(element);
  return {
    hold: duration(style, "--skullet-hold", DEFAULT_DURATIONS.hold),
    fade: duration(style, "--skullet-fade", DEFAULT_DURATIONS.fade),
    resize: duration(style, "--skullet-resize", DEFAULT_DURATIONS.resize),
    sequence: duration(style, "--skullet-cascade", DEFAULT_DURATIONS.sequence)
  };
}
function duration(style, name, fallback) {
  const raw = style.getPropertyValue(name).trim();
  const parsed = /^-?\d*\.?\d+ms$/.test(raw) ? Number.parseFloat(raw) : /^-?\d*\.?\d+s$/.test(raw) ? Number.parseFloat(raw) * 1e3 : fallback;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 0), LONGEST_MS);
}
var IMAGE_TIMEOUT_MS = 1e4;
function prefersReducedMotion() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function fadeIn(element, duration2, delay = 0, enter = {}) {
  return element.animate([{ opacity: 0, ...enter }, { opacity: 1 }], {
    duration: duration2,
    delay,
    easing: "ease",
    fill: "forwards"
  });
}
function easeHeight(element, from, to, duration2) {
  if (Math.abs(to - from) < 1) return null;
  return element.animate([{ height: `${from}px` }, { height: `${to}px` }], {
    duration: duration2,
    easing: "ease-in-out",
    fill: "forwards"
  });
}
function settle(element) {
  for (const animation of element.getAnimations()) animation.cancel();
  element.style.removeProperty("height");
  element.style.removeProperty("overflow");
  element.style.removeProperty("opacity");
}

// js/shimmer.ts
var SHIMMER_DURATIONS = { slow: 4e3, fast: 2e3 };
var PULSE_DURATIONS = { slow: 2400, fast: 1200 };
var REFERENCE_WIDTH = 1280;
var MAX_BAND = 320;
var SPACING = 2.5;
var SLANT = "110deg";
var PEAK = 0.85;
var STEPS = 12;
var ease = (t) => (1 - Math.cos(Math.PI * t)) / 2;
var ANIMATIONS = ["shimmer", "group-shimmer", "pulse", "none"];
var SPEEDS = ["slow", "fast"];
function motionOf(element) {
  const style = getComputedStyle(element);
  const animation = oneOf2(
    style.getPropertyValue("--skullet-animation").trim(),
    ANIMATIONS,
    "shimmer"
  );
  const speed = oneOf2(style.getPropertyValue("--skullet-speed").trim(), SPEEDS, "slow");
  const durations = animation === "pulse" ? PULSE_DURATIONS : SHIMMER_DURATIONS;
  return { animation, duration: durations[speed] };
}
function publishDurations(root) {
  const style = getComputedStyle(root);
  const speed = oneOf2(style.getPropertyValue("--skullet-speed").trim(), SPEEDS, "slow");
  const published = document.documentElement.style;
  published.setProperty("--skullet-shimmer-duration", `${SHIMMER_DURATIONS[speed]}ms`);
  published.setProperty("--skullet-pulse-duration", `${PULSE_DURATIONS[speed]}ms`);
}
function drawShimmer(bar, box, container, motion) {
  bar.style.animationName = "none";
  bar.style.backgroundImage = "";
  if (motion.animation === "none" || prefersReducedMotion()) return;
  const span = Math.max(container.width, box.width, 1);
  const duration2 = motion.animation === "pulse" ? motion.duration : Math.max(motion.duration * span / REFERENCE_WIDTH, 1);
  const band = Math.min(MAX_BAND, span);
  const period = band * SPACING;
  const image = gradient(band, period);
  bar.style.animationDuration = `${duration2}ms`;
  bar.style.animationTimingFunction = "linear";
  bar.style.animationIterationCount = "infinite";
  bar.style.animationDelay = `-${performance.now() % duration2}ms`;
  if (motion.animation === "pulse") {
    bar.style.animationName = "skullet-pulse";
    return;
  }
  bar.style.animationName = motion.animation === "group-shimmer" ? "skullet-group-shimmer" : "skullet-shimmer";
  bar.style.backgroundImage = image;
  if (motion.animation === "group-shimmer") {
    const width = Math.max(container.width, 1);
    const height = Math.max(container.height, 1);
    bar.style.backgroundSize = `${width}px ${height}px`;
    bar.style.backgroundPosition = `${-box.x}px ${-box.y}px`;
    bar.style.setProperty("--skullet-from", `${-box.x}px`);
    bar.style.setProperty("--skullet-to", `${-box.x + width + period}px`);
    return;
  }
  bar.style.setProperty("--skullet-band", `${period}px`);
}
function gradient(band, period) {
  const stop = (at, alpha) => `color-mix(in srgb, var(--skullet-highlight) ${(alpha * 100).toFixed(1)}%, transparent) ${(at * band).toFixed(2)}px`;
  const stops = [];
  for (let step = 0; step <= STEPS; step++) {
    stops.push(stop(step / STEPS * PEAK, ease(step / STEPS)));
  }
  for (let step = 1; step <= STEPS; step++) {
    stops.push(stop(PEAK + step / STEPS * (1 - PEAK), ease(1 - step / STEPS)));
  }
  stops.push(`transparent ${period.toFixed(2)}px`);
  return `repeating-linear-gradient(${SLANT}, ${stops.join(", ")})`;
}
function oneOf2(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

// js/shadow.ts
var SHADOW_CSS = `:host{display:block;position:absolute;inset:0;overflow:hidden;pointer-events:none}
[data-skullet-bars]{position:absolute;inset:0;opacity:0}
[data-skullet-bars][data-skullet-phase="bars"]{opacity:1}
[data-skullet-bars]:not([data-skullet-phase="bars"]){transition:opacity var(--skullet-fade, 200ms) ease}
[data-skullet-bar]{position:absolute;left:0;top:0;background:var(--skullet-base);border-radius:var(--skullet-radius)}
@keyframes skullet-shimmer{from{background-position-x:0}to{background-position-x:var(--skullet-band)}}
@keyframes skullet-group-shimmer{from{background-position-x:var(--skullet-from)}to{background-position-x:var(--skullet-to)}}
@keyframes skullet-pulse{0%,100%{opacity:1}50%{opacity:0.45}}
@keyframes skullet-pre-hold{to{opacity:1}}`;
function attachShadow(overlay) {
  const root = overlay.shadowRoot ?? overlay.attachShadow({ mode: "open" });
  const existing = root.querySelector("[data-skullet-bars]");
  if (existing) return { bars: existing };
  const bars = document.createElement("div");
  bars.setAttribute("data-skullet-bars", "");
  root.append(bars);
  if (typeof CSSStyleSheet === "function" && "adoptedStyleSheets" in root) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(SHADOW_CSS);
    root.adoptedStyleSheets = [sheet];
  } else {
    const style = document.createElement("style");
    style.textContent = SHADOW_CSS;
    root.append(style);
  }
  return { bars };
}

// js/registry.ts
var registered = /* @__PURE__ */ new Map();
function registerReveal(name, spec) {
  registered.set(name, spec);
}
function registeredReveal(name) {
  return registered.get(name);
}

// js/plan.ts
var SKELETON_DELAY = DEFAULT_DURATIONS.hold;
var QUICK_FADE = 120;
var SMALL_HEIGHT = 72;
var SMALL_PIECES = 3;
var MAX_DELAY = 1e3;
var MAX_DURATION = 1e3;
var MAX_WIPE_AREA = 1.5;
var clamp = (value, max) => Math.min(Math.max(value, 0), max);
function pieces(root) {
  const found = [];
  const visit = (element) => {
    for (const child of element.children) {
      const ownText = [...child.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
      );
      if (!child.firstElementChild || ownText || child.localName === "svg") {
        found.push(child);
      } else {
        visit(child);
      }
    }
  };
  visit(root);
  return found;
}
function unitOf(piece, root) {
  for (let element = piece; element && element !== root; element = element.parentElement) {
    const parent = element.parentElement;
    if (!parent) break;
    const alike = [...parent.children].filter(
      (sibling) => sibling.localName === element.localName && sibling.className === element.className
    );
    if (alike.length >= 3) return element;
  }
  return piece;
}
function timePieces(content, reveal, order, settings, late) {
  const fontSize = (element) => Number.parseFloat(getComputedStyle(element).fontSize) || 16;
  const units = /* @__PURE__ */ new Map();
  const piecesIn = pieces(content).map((element) => {
    const unit = unitOf(element, content);
    let found = units.get(unit);
    if (!found) {
      found = { rect: unit.getBoundingClientRect(), size: 0 };
      units.set(unit, found);
    }
    found.size = Math.max(found.size, fontSize(element));
    return { element, unit, size: fontSize(element) };
  });
  return piecesIn.map(({ element, unit, size }) => {
    const piece = {
      rect: element.getBoundingClientRect(),
      unit: unit.getBoundingClientRect(),
      secondary: size < (units.get(unit)?.size ?? size),
      reveal,
      late
    };
    return { element, piece, order: order(piece, settings) ?? 0 };
  });
}
function barPiece(rect, reveal, units, late) {
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const unit = units.find((box) => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) ?? null;
  const fontSize = unit ? Math.max(rect.height, 1) : rect.height;
  return { rect, unit, secondary: unit ? rect.height < fontSize * 0.8 : false, reveal, late };
}
var instant = { duration: 0 };
var together = { order: "together" };
var sequence = { order: byPosition };
var sweep = { sweep: true };
function byPosition({ rect, reveal }, { cascade }) {
  const down = (rect.top - reveal.top) / Math.max(reveal.height, 1);
  const across = (rect.left - reveal.left) / Math.max(reveal.width, 1);
  return clamp(down * 0.8 + across * 0.2, 1) * cascade;
}
var onScreen = (rect) => rect.bottom > 0 && rect.top < innerHeight;
var byRow = ({ rect, unit, secondary, late }, { cascade, secondaryDelay }) => {
  if (!unit) return onScreen(rect) ? 0 : null;
  if (!onScreen(unit)) return null;
  const at = clamp(unit.top / Math.max(innerHeight, 1), 1) * cascade;
  return Math.max(at - late, 0) + (secondary ? secondaryDelay : 0);
};
var byContent = (context2) => context2.height < SMALL_HEIGHT || context2.pieces <= SMALL_PIECES ? together : { order: byRow };
var quickly = (context2) => context2.input || context2.waited < context2.hold ? instant : context2.refetch ? { order: "together", duration: QUICK_FADE } : null;
var smart = {
  choose: (context2) => quickly(context2) ?? byContent(context2)
};
var NAMED = { instant, together, sequence, sweep, smart };
function revealSpec(mode) {
  if (mode && typeof mode === "object") return mode;
  const name = mode ?? "smart";
  return NAMED[name] ?? registeredReveal(name) ?? together;
}
function planReveal(spec, context2, defaults) {
  let resolved = spec;
  while (resolved.choose) {
    const { choose, ...rest } = resolved;
    resolved = { ...rest, ...choose(context2) };
  }
  const duration2 = clamp(resolved.duration ?? defaults.duration, MAX_DURATION);
  const delay = clamp(Math.max(resolved.delay ?? defaults.delay, 0), MAX_DELAY);
  const enter = resolved.enter ?? defaults.enter;
  if (!duration2) return { kind: "instant" };
  if (resolved.wipe) return { kind: "wipe", wipe: resolved.wipe, delay, duration: duration2 };
  if (resolved.sweep) return { kind: "sweep", delay, duration: duration2 };
  if (typeof resolved.order === "function") {
    return { kind: "sequence", order: resolved.order, delay, duration: duration2, enter };
  }
  return { kind: "together", delay, duration: duration2, enter };
}

// js/bar.ts
function createBar(rect) {
  const bar = document.createElement("span");
  bar.setAttribute("data-skullet-bar", "");
  bar.style.cssText = `width:${rect.width}px;height:${rect.height}px;transform:translate(${rect.x}px,${rect.y}px)`;
  return bar;
}

// js/engine.ts
var DEBUG = (() => {
  try {
    return new URLSearchParams(location.search).has("skullet-debug");
  } catch {
    return false;
  }
})();
var DEBUG_LOADING = "2px solid #3b82f6";
function settingsOf(root) {
  const durations = durationsOf(root);
  const style = getComputedStyle(root);
  const raw = style.getPropertyValue("--skullet-delay").trim();
  const parsed = /^-?\d*\.?\d+ms$/.test(raw) ? Number.parseFloat(raw) : /^-?\d*\.?\d+s$/.test(raw) ? Number.parseFloat(raw) * 1e3 : 0;
  return {
    fade: durations.fade,
    delay: Math.min(Math.max(parsed, 0), 1e3),
    hold: durations.hold
  };
}
function enterOf(root) {
  const style = getComputedStyle(root);
  const filter = style.getPropertyValue("--skullet-enter-filter").trim();
  const scale = style.getPropertyValue("--skullet-enter-scale").trim();
  const enter = {};
  if (filter && filter !== "none") enter.filter = filter;
  if (scale && scale !== "1") enter.transform = `scale(${scale})`;
  return Object.keys(enter).length > 0 ? enter : void 0;
}
function orderSettings(root) {
  const durations = durationsOf(root);
  const raw = getComputedStyle(root).getPropertyValue("--skullet-secondary-delay").trim();
  const parsed = /^-?\d*\.?\d+ms$/.test(raw) ? Number.parseFloat(raw) : /^-?\d*\.?\d+s$/.test(raw) ? Number.parseFloat(raw) * 1e3 : 60;
  return { cascade: durations.sequence, secondaryDelay: Math.max(parsed, 0) };
}
var ACTIVE_WINDOW = 400;
var lastInput = Number.NEGATIVE_INFINITY;
var listening = false;
var engines = /* @__PURE__ */ new Set();
var motionListening = false;
function listenForMotion() {
  if (motionListening || typeof matchMedia !== "function") return;
  motionListening = true;
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener?.("change", () => {
    for (const engine of engines) engine.motionChanged();
  });
}
function listenForInput() {
  if (listening || typeof addEventListener !== "function") return;
  listening = true;
  for (const type of ["wheel", "touchmove", "keydown"]) {
    addEventListener(
      type,
      () => {
        lastInput = performance.now();
      },
      { passive: true, capture: true }
    );
  }
}
var BATCH_WINDOW = 150;
var batch = null;
function batchStart() {
  const now = performance.now();
  if (batch === null || now - batch > BATCH_WINDOW) batch = now;
  return batch;
}
var DEBUG_STILL = "2px solid #22c55e";
var DEBUG_MOVED = "2px solid #ef4444";
function debugOn(root) {
  return debug || root.hasAttribute("skullet-debug");
}
function setDebug(on) {
  debug = on;
}
var debug = DEBUG;
function stateOf(root) {
  return root.getAttribute("data-skullet-state") ?? "loading";
}
var SkulletEngine = class {
  root;
  override;
  content;
  overlay = null;
  bars = null;
  frame = 0;
  started = false;
  resizes = [];
  mutations = null;
  state = "loading";
  phase = null;
  pass = "instant";
  pinned = 0;
  holdTimer = 0;
  safetyTimer = 0;
  easing = false;
  /** performance.now() when the bars first showed; 0 when they never did. */
  shownAt = 0;
  /** ms since the first reveal of the batch this one joins. */
  late = 0;
  /** The skeleton was drawn from the data already on screen. */
  refetched = false;
  constructor(root, options = {}) {
    this.root = root;
    this.override = options.reveal;
    this.content = root.querySelector("[data-skullet-content]");
  }
  start() {
    if (this.started) return;
    this.started = true;
    engines.add(this);
    listenForInput();
    listenForMotion();
    const content = this.content;
    if (!content) return;
    document.documentElement.classList.add("skullet-js");
    this.state = stateOf(this.root);
    if (this.state === "loading") this.show();
    this.observe(content);
  }
  /** Runs before LiveView patches the content in: the last moment the old shape exists. */
  beforeUpdate() {
    if (!this.started) return;
    this.resolve();
    this.state = stateOf(this.root);
    if (this.state !== "loading" || this.phase !== "bars" || this.instant) {
      this.pass = "instant";
      return;
    }
    this.pass = "fade";
    this.pinned = this.root.getBoundingClientRect().height;
    this.root.style.height = `${this.pinned}px`;
    this.root.style.overflow = "hidden";
    this.safetyTimer = window.setTimeout(
      () => {
        this.safetyTimer = 0;
        this.release();
      },
      durationsOf(this.root).fade + 200
    );
  }
  /** Runs after the patch: reveal what arrived, or start over. */
  update() {
    if (!this.started) return;
    this.resolve();
    const next = stateOf(this.root);
    const previous = this.state;
    this.state = next;
    if (next === "loaded") {
      if (previous === "loading") this.reveal();
    } else if (next === "failed") {
      this.stop();
    } else {
      this.pass = "instant";
      this.clearSafety();
      this.release();
      if (previous === "loaded") {
        this.refetched = true;
        this.show();
      } else if (this.nested) {
        this.hideOverlay(false);
      } else if (!this.phase) {
        this.show();
      } else this.schedule();
    }
  }
  destroy() {
    this.clearHold();
    this.clearSafety();
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    for (const resize of this.resizes) resize.disconnect();
    this.resizes = [];
    this.mutations?.disconnect();
    this.mutations = null;
    this.phase = null;
    this.hideOverlay(false);
    this.overlay = null;
    this.bars = null;
    this.release();
    engines.delete(this);
    this.started = false;
  }
  /** The OS's reduced-motion setting changed: re-apply (or remove) the animation. */
  motionChanged() {
    if (this.phase) this.schedule();
  }
  get instant() {
    return this.root.getAttribute("data-skullet-reveal") === "instant" || prefersReducedMotion();
  }
  /** ms a skeleton waits before showing: a spec's `hold` wins over `--skullet-hold`. */
  hold() {
    return this.spec().hold ?? settingsOf(this.root).hold;
  }
  /**
   * True while the nearest skeleton around this one is loading: both would animate the same
   * pixels, and two overlays read as a broken animation.
   */
  get nested() {
    return this.root.parentElement?.closest('.skullet[data-skullet-state="loading"]') != null;
  }
  show() {
    if (this.state !== "loading" || this.nested) return;
    this.createOverlay();
    this.pass = "instant";
    this.easing = false;
    const prePainted = (this.bars?.children.length ?? 0) > 0;
    if (this.instant || prePainted || this.hold() <= 0) {
      this.showBars();
    } else {
      this.phase = "holding";
      this.setPhase("holding");
      this.holdTimer = window.setTimeout(() => {
        this.holdTimer = 0;
        if (this.phase === "holding") this.showBars();
      }, this.hold());
    }
    this.schedule();
  }
  showBars() {
    this.phase = "bars";
    this.shownAt = performance.now();
    this.setPhase("bars");
    this.schedule();
  }
  /** Phase lives in the shadow root: LiveView patches the light DOM, not this. */
  setPhase(phase) {
    if (!this.bars) return;
    if (phase) this.bars.setAttribute("data-skullet-phase", phase);
    else this.bars.removeAttribute("data-skullet-phase");
  }
  reveal() {
    this.clearHold();
    this.revealImages();
    this.late = performance.now() - batchStart();
    const plan = this.plan();
    this.refetched = false;
    const fade = this.pass === "fade" && !this.instant;
    this.pass = "instant";
    this.phase = null;
    if (!this.overlay || !fade) {
      this.hideOverlay(false);
      this.clearSafety();
      this.release();
      if (this.content) this.markMovement(this.content.getBoundingClientRect().height);
      return;
    }
    const target = this.content ? this.content.getBoundingClientRect().height : this.pinned;
    const durations = durationsOf(this.root);
    this.easing = true;
    this.runPlan(plan);
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      this.easing = false;
      this.clearSafety();
      this.release();
      this.markMovement(target);
    };
    const ease2 = easeHeight(this.root, this.pinned, target, durations.resize);
    if (ease2) ease2.finished.then(finish, finish);
    else window.setTimeout(finish, durations.fade);
  }
  stop() {
    this.clearHold();
    this.clearSafety();
    this.phase = null;
    this.hideOverlay(false);
    this.overlay = null;
    this.bars = null;
    this.release();
  }
  /** Off is a phase, not an animation: the shadow's transition fades it, and the bars are
   * cleared a beat later — unless a new cycle has already taken the container over. */
  /**
   * Images arrive after the data does. One that has not decoded yet would pop in, so it
   * waits at zero opacity and fades in when it is ready (or after the timeout, if it never
   * is). The pane's own box is what reserves the space, so nothing moves either way.
   */
  revealImages() {
    const content = this.content;
    if (!content || prefersReducedMotion()) return;
    const fade = durationsOf(this.root).fade;
    for (const image of content.querySelectorAll("img")) {
      if (image.complete) continue;
      image.style.opacity = "0";
      let shown = false;
      const show = () => {
        if (shown) return;
        shown = true;
        if (!image.isConnected) return;
        const animation = image.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: fade,
          easing: "ease",
          fill: "forwards"
        });
        animation.finished.then(
          () => settle(image),
          () => settle(image)
        );
      };
      const timer = window.setTimeout(show, IMAGE_TIMEOUT_MS);
      const ready = () => {
        window.clearTimeout(timer);
        show();
      };
      image.decode?.().then(ready, ready);
    }
  }
  /** The spec this skeleton asks for — its `reveal` attribute, or `smart`. */
  spec() {
    return this.override ?? revealSpec(this.root.getAttribute("data-skullet-reveal"));
  }
  /** The plan for this reveal, decided the moment the content lands. */
  plan() {
    const content = this.content;
    const reveal = this.root.getBoundingClientRect();
    return planReveal(
      this.spec(),
      {
        waited: this.shownAt === 0 ? Number.POSITIVE_INFINITY : performance.now() - this.shownAt,
        input: performance.now() - lastInput < ACTIVE_WINDOW,
        refetch: this.refetched,
        hold: this.hold(),
        height: content ? content.getBoundingClientRect().height : reveal.height,
        pieces: content ? content.children.length : 0
      },
      {
        duration: settingsOf(this.root).fade,
        delay: settingsOf(this.root).delay,
        enter: enterOf(this.root)
      }
    );
  }
  runPlan(plan) {
    if (plan.kind === "instant") {
      this.hideOverlay(false);
      return;
    }
    const { delay, duration: duration2 } = plan;
    if (plan.kind === "sweep") {
      this.sweepOut(duration2, delay);
    } else if (plan.kind === "wipe") {
      this.wipeOut(plan, duration2, delay);
    } else if (plan.kind === "sequence") {
      this.runSequence(plan, duration2);
    } else {
      if (this.content)
        fadeIn(this.content, duration2, delay, "enter" in plan ? plan.enter : void 0);
      this.hideOverlay(true, duration2, delay);
    }
  }
  /** `sequence`: pieces arrive in `order`, the bars they replace leave on the same beat. */
  runSequence(plan, duration2) {
    const content = this.content;
    const bars = this.bars;
    if (!content || !bars) return;
    const box = content.getBoundingClientRect();
    const reveal = new DOMRect(box.left, box.top, box.width, box.height);
    const pieces2 = timePieces(content, reveal, plan.order, orderSettings(this.root), this.late);
    const units = [...new Set(pieces2.map((piece) => piece.piece.unit).filter(Boolean))];
    for (const { element, order } of pieces2) {
      const delay = Math.min(order, MAX_DELAY) + plan.delay;
      const animation = element.animate([{ opacity: 0, ...plan.enter }, { opacity: 1 }], {
        duration: duration2,
        delay,
        easing: "ease",
        fill: "both"
      });
      animation.finished.then(
        () => animation.cancel(),
        () => animation.cancel()
      );
    }
    bars.style.transition = "none";
    let last = 0;
    for (const bar of [...bars.children]) {
      const order = plan.order(
        barPiece(bar.getBoundingClientRect(), reveal, units, this.late),
        orderSettings(this.root)
      ) ?? 0;
      const delay = Math.min(order, MAX_DELAY) + plan.delay;
      last = Math.max(last, delay + duration2);
      const animation = bar.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: duration2,
        delay,
        easing: "ease",
        fill: "forwards"
      });
      animation.finished.catch(() => {
      });
    }
    window.setTimeout(() => {
      bars.style.removeProperty("transition");
      if (this.bars === bars && this.phase === null) {
        bars.replaceChildren();
        this.setPhase(null);
      }
    }, last + 100);
  }
  /**
   * A wipe of your own: the pane's mask is drawn each frame from `wipe.mask`, and the
   * skeleton's from `wipe.out` — or crossfaded out when you leave that off. Too big a
   * reveal falls back to that crossfade: a front across it would be mostly off screen.
   */
  wipeOut(plan, duration2, delay) {
    const content = this.content;
    const overlay = this.overlay;
    const bars = this.bars;
    if (!content || !overlay || !bars) return;
    const rect = content.getBoundingClientRect();
    const reveal = this.root.getBoundingClientRect();
    const pane = { rect, reveal };
    if (rect.width * rect.height > innerWidth * innerHeight * MAX_WIPE_AREA) {
      if (this.content) fadeIn(content, duration2, delay);
      this.hideOverlay(true, duration2, delay);
      return;
    }
    const maskOf = plan.wipe.out;
    const frame = (progress, element) => {
      const image = maskOf ? maskOf(progress, pane) : "";
      element.style.maskImage = image;
      element.style.webkitMaskImage = image;
    };
    const clear = () => {
      for (const element of [content, overlay]) {
        element.style.removeProperty("mask-image");
        element.style.removeProperty("-webkit-mask-image");
      }
      if (this.bars === bars && this.phase === null) {
        bars.replaceChildren();
        this.setPhase(null);
      }
    };
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clear();
    };
    const start = performance.now() + delay;
    const step = () => {
      const progress = Math.min(Math.max((performance.now() - start) / duration2, 0), 1);
      const image = plan.wipe.mask(progress, pane);
      content.style.maskImage = image;
      content.style.webkitMaskImage = image;
      if (maskOf) frame(progress, overlay);
      if (progress < 1) requestAnimationFrame(step);
      else finish();
    };
    if (maskOf) {
      bars.style.transition = "none";
      this.setPhase(null);
    } else {
      this.hideOverlay(true, duration2, delay);
    }
    window.requestAnimationFrame(step);
    window.setTimeout(finish, delay + duration2 + 200);
  }
  /** `sweep`: a wipe uncovers the content behind the skeleton's front. */
  sweepOut(duration2, delay = 0) {
    const overlay = this.overlay;
    const bars = this.bars;
    if (!overlay || !bars) return;
    bars.style.transition = "none";
    const clear = () => {
      overlay.style.removeProperty("clip-path");
      bars.style.removeProperty("transition");
      if (this.bars === bars && this.phase === null) {
        bars.replaceChildren();
        this.setPhase(null);
      }
    };
    let cleared = false;
    const finish = () => {
      if (cleared) return;
      cleared = true;
      clear();
    };
    const animation = overlay.animate(
      [{ clipPath: "inset(0% 0 0 0)" }, { clipPath: "inset(100% 0 0 0)" }],
      { duration: duration2, delay, easing: "ease-in", fill: "forwards" }
    );
    animation.finished.then(finish, finish);
    window.setTimeout(finish, delay + duration2 + 200);
  }
  /** Debug: did the reveal move the page? Red with the distance, green when it didn't. */
  markMovement(revealed) {
    if (!debugOn(this.root)) return;
    const moved = Math.abs(revealed - this.pinned);
    this.root.style.outline = moved < 1 ? DEBUG_STILL : DEBUG_MOVED;
    this.root.title = moved < 1 ? "skullet: no movement" : `skullet: moved ${moved.toFixed(1)}px`;
  }
  hideOverlay(animate, duration2, delay = 0) {
    this.setPhase(null);
    const bars = this.bars;
    if (!bars) return;
    if (!animate) {
      bars.replaceChildren();
      return;
    }
    const fade = duration2 ?? durationsOf(this.root).fade;
    if (duration2 !== void 0) bars.style.transitionDuration = `${duration2}ms`;
    if (delay > 0) bars.style.transitionDelay = `${delay}ms`;
    window.setTimeout(() => {
      if (this.bars !== bars || this.phase !== null) return;
      bars.replaceChildren();
      bars.style.removeProperty("transition-duration");
      bars.style.removeProperty("transition-delay");
    }, fade + delay);
  }
  release() {
    settle(this.root);
    if (this.content) settle(this.content);
  }
  /**
   * The overlay is server-rendered: LiveView prunes children it does not know about, so
   * an overlay the engine created itself would vanish on the first patch. A plain page
   * may still leave it out; then one is made here.
   */
  /**
   * LiveView reuses nodes positionally: after a structural change the node the engine
   * holds can be a different element, or detached entirely. Both are looked up again by
   * selector before every use, so the engine never measures or draws into a node that is
   * no longer the content pane or the overlay.
   */
  resolve() {
    const content = this.root.querySelector("[data-skullet-content]");
    if (content && content !== this.content) this.content = content;
    const overlay = this.root.querySelector("[data-skullet-overlay]");
    if (overlay && overlay !== this.overlay) {
      this.overlay = overlay;
      this.bars = overlay.shadowRoot?.querySelector("[data-skullet-bars]") ?? null;
    }
  }
  createOverlay() {
    const overlay = this.overlay?.isConnected === true ? this.overlay : this.root.querySelector("[data-skullet-overlay]") ?? document.createElement("div");
    overlay.setAttribute("data-skullet-overlay", "");
    overlay.setAttribute("aria-hidden", "true");
    if (!overlay.isConnected) this.root.append(overlay);
    const { bars } = attachShadow(overlay);
    settle(bars);
    this.overlay = overlay;
    this.bars = bars;
  }
  observe(content) {
    const resize = new ResizeObserver(() => {
      if (this.easing) return;
      this.schedule();
    });
    resize.observe(this.root);
    resize.observe(content);
    this.resizes.push(resize);
    this.mutations = new MutationObserver(() => this.schedule());
    this.mutations.observe(content, { childList: true, subtree: true, characterData: true });
    const afterFonts = () => {
      resetFontCache();
      this.schedule();
    };
    document.fonts?.addEventListener?.("loadingdone", afterFonts);
    document.fonts?.ready.then(afterFonts);
    for (const image of content.querySelectorAll("img")) {
      if (!image.complete) image.addEventListener("load", () => this.schedule(), { once: true });
      image.decode?.().then(() => this.schedule()).catch(() => {
      });
    }
  }
  clearHold() {
    if (!this.holdTimer) return;
    clearTimeout(this.holdTimer);
    this.holdTimer = 0;
  }
  clearSafety() {
    if (!this.safetyTimer) return;
    clearTimeout(this.safetyTimer);
    this.safetyTimer = 0;
  }
  schedule() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.draw();
    });
  }
  draw() {
    this.resolve();
    if (stateOf(this.root) !== "loading" || this.nested) return;
    if (!this.overlay?.isConnected || !this.bars?.isConnected) {
      this.createOverlay();
      this.setPhase(this.phase);
    }
    const { content, overlay, bars } = this;
    if (!content || !overlay || !bars) return;
    const { lines, blocks } = measure(content, overlay);
    const rects = [...blocks];
    for (const line of lines) {
      const box = barBox(line);
      rects.push({ x: line.x, y: box.y, width: line.width, height: box.height });
    }
    if (debugOn(this.root)) this.root.style.outline = DEBUG_LOADING;
    const motion = motionOf(this.root);
    publishDurations(this.root);
    const host = this.root.getBoundingClientRect();
    const container = { width: host.width, height: host.height };
    const fragment = document.createDocumentFragment();
    for (const rect of rects) {
      const bar = createBar(rect);
      drawShimmer(bar, rect, container, motion);
      fragment.append(bar);
    }
    bars.replaceChildren(fragment);
  }
};

// js/skullet.ts
if (typeof window !== "undefined") window.__skulletEngine = { attach, measure };
function attach(root, options = {}) {
  const engine = new SkulletEngine(root, options);
  engine.start();
  return engine;
}
var SkulletHook = {
  mounted() {
    this.engine = attach(this.el);
  },
  beforeUpdate() {
    this.engine?.beforeUpdate();
  },
  updated() {
    this.engine?.update();
  },
  destroyed() {
    this.engine?.destroy();
  }
};
export {
  SkulletHook,
  attach,
  registerReveal,
  setDebug
};
