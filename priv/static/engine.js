import { measure } from "./measure.js";
import { barBox } from "./metrics.js";
const SHADOW_CSS = `:host{display:block;position:absolute;inset:0;overflow:hidden;pointer-events:none}
[data-skullet-bars]{position:absolute;inset:0}
[data-skullet-bar]{position:absolute;left:0;top:0;background:var(--skullet-base);border-radius:var(--skullet-radius)}`;
export function stateOf(root) {
    return root.getAttribute("data-skullet-state") ?? "loading";
}
export class SkulletEngine {
    root;
    content;
    overlay = null;
    bars = null;
    frame = 0;
    started = false;
    resizes = [];
    mutations = null;
    constructor(root) {
        this.root = root;
        this.content = root.querySelector("[data-skullet-content]");
    }
    start() {
        if (this.started)
            return;
        this.started = true;
        const content = this.content;
        if (!content)
            return;
        const overlay = document.createElement("div");
        overlay.setAttribute("data-skullet-overlay", "");
        overlay.setAttribute("aria-hidden", "true");
        const shadow = overlay.attachShadow({ mode: "open" });
        const style = document.createElement("style");
        style.textContent = SHADOW_CSS;
        const bars = document.createElement("div");
        bars.setAttribute("data-skullet-bars", "");
        shadow.append(style, bars);
        this.root.append(overlay);
        this.overlay = overlay;
        this.bars = bars;
        this.root.setAttribute("data-skullet-phase", "bars");
        if (stateOf(this.root) === "loading")
            this.schedule();
        this.observe(content);
    }
    beforeUpdate() {
        // The reveal lives here from Task 6 on.
    }
    update() {
        if (stateOf(this.root) === "loading")
            this.schedule();
    }
    destroy() {
        if (this.frame)
            cancelAnimationFrame(this.frame);
        this.frame = 0;
        for (const resize of this.resizes)
            resize.disconnect();
        this.resizes = [];
        this.mutations?.disconnect();
        this.mutations = null;
        this.overlay?.remove();
        this.overlay = null;
        this.bars = null;
        this.root.removeAttribute("data-skullet-phase");
        this.started = false;
    }
    observe(content) {
        const resize = new ResizeObserver(() => this.schedule());
        resize.observe(this.root);
        resize.observe(content);
        this.resizes.push(resize);
        this.mutations = new MutationObserver(() => this.schedule());
        this.mutations.observe(content, { childList: true, subtree: true, characterData: true });
        document.fonts?.ready.then(() => this.schedule());
        for (const image of content.querySelectorAll("img")) {
            if (!image.complete)
                image.addEventListener("load", () => this.schedule(), { once: true });
        }
    }
    schedule() {
        if (this.frame)
            return;
        this.frame = requestAnimationFrame(() => {
            this.frame = 0;
            this.draw();
        });
    }
    draw() {
        const { content, overlay, bars } = this;
        if (!content || !overlay || !bars)
            return;
        if (stateOf(this.root) !== "loading")
            return;
        const { lines, blocks } = measure(content, overlay);
        const rects = [...blocks];
        for (const line of lines) {
            const box = barBox(line);
            rects.push({ x: line.x, y: box.y, width: line.width, height: box.height });
        }
        const fragment = document.createDocumentFragment();
        for (const rect of rects)
            fragment.append(createBar(rect));
        bars.replaceChildren(fragment);
    }
}
function createBar(rect) {
    const bar = document.createElement("span");
    bar.setAttribute("data-skullet-bar", "");
    bar.style.cssText = `width:${rect.width}px;height:${rect.height}px;transform:translate(${rect.x}px,${rect.y}px)`;
    return bar;
}
