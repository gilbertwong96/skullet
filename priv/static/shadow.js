const SHADOW_CSS = `:host{display:block;position:absolute;inset:0;overflow:hidden;pointer-events:none}
[data-skullet-bars]{position:absolute;inset:0;opacity:0}
[data-skullet-bars][data-skullet-phase="bars"]{opacity:1}
[data-skullet-bars]:not([data-skullet-phase="bars"]){transition:opacity var(--skullet-fade, 200ms) ease}
[data-skullet-bar]{position:absolute;left:0;top:0;background:var(--skullet-base);border-radius:var(--skullet-radius)}
@keyframes skullet-shimmer{from{background-position-x:0}to{background-position-x:var(--skullet-band)}}
@keyframes skullet-group-shimmer{from{background-position-x:var(--skullet-from)}to{background-position-x:var(--skullet-to)}}
@keyframes skullet-pulse{0%,100%{opacity:1}50%{opacity:0.45}}
@keyframes skullet-pre-hold{to{opacity:1}}`;
/** The overlay's shadow root, made once and reused by the pre-paint script and the engine. */
export function attachShadow(overlay) {
    const root = overlay.shadowRoot ?? overlay.attachShadow({ mode: "open" });
    const existing = root.querySelector("[data-skullet-bars]");
    if (existing)
        return { bars: existing };
    const bars = document.createElement("div");
    bars.setAttribute("data-skullet-bars", "");
    root.append(bars);
    if (typeof CSSStyleSheet === "function" && "adoptedStyleSheets" in root) {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(SHADOW_CSS);
        root.adoptedStyleSheets = [sheet];
    }
    else {
        const style = document.createElement("style");
        style.textContent = SHADOW_CSS;
        root.append(style);
    }
    return { bars };
}
