/** Defaults for the three timings; every one is a custom property too. */
export const DEFAULT_DURATIONS = { hold: 150, fade: 200, resize: 280 };
const LONGEST_MS = 5000;
export function durationsOf(element) {
    const style = getComputedStyle(element);
    return {
        hold: duration(style, "--skullet-hold", DEFAULT_DURATIONS.hold),
        fade: duration(style, "--skullet-fade", DEFAULT_DURATIONS.fade),
        resize: duration(style, "--skullet-resize", DEFAULT_DURATIONS.resize)
    };
}
function duration(style, name, fallback) {
    const raw = style.getPropertyValue(name).trim();
    const parsed = /^-?\d*\.?\d+ms$/.test(raw)
        ? Number.parseFloat(raw)
        : /^-?\d*\.?\d+s$/.test(raw)
            ? Number.parseFloat(raw) * 1000
            : fallback;
    if (!Number.isFinite(parsed))
        return fallback;
    return Math.min(Math.max(parsed, 0), LONGEST_MS);
}
/** Longest an undecoded image stays hidden — a stalled request must not hold it back. */
export const IMAGE_TIMEOUT_MS = 10_000;
export function prefersReducedMotion() {
    return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
export function fadeIn(element, duration) {
    return element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration,
        easing: "ease",
        fill: "forwards"
    });
}
/** The reveal easing to its new height, when the sample guessed the content wrong. */
export function easeHeight(element, from, to, duration) {
    if (Math.abs(to - from) < 1)
        return null;
    return element.animate([{ height: `${from}px` }, { height: `${to}px` }], {
        duration,
        easing: "ease-in-out",
        fill: "forwards"
    });
}
/**
 * Whatever happened, the element keeps no inline height, overflow or opacity, and no
 * running animation: a patch that never lands must not leave the content invisible.
 */
export function settle(element) {
    for (const animation of element.getAnimations())
        animation.cancel();
    element.style.removeProperty("height");
    element.style.removeProperty("overflow");
    element.style.removeProperty("opacity");
}
