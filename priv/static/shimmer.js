import { prefersReducedMotion } from "./reveal.js";
export const SHIMMER_DURATIONS = { slow: 4000, fast: 2000 };
export const PULSE_DURATIONS = { slow: 2400, fast: 1200 };
/** One shimmer loop across this width; any other width keeps the same pace. */
export const REFERENCE_WIDTH = 1280;
/** The highlight's band, so it doesn't grow heavier on a wide screen. */
export const MAX_BAND = 320;
/** Bands follow each other this many band-widths apart, start to start. */
export const SPACING = 2.5;
export const SLANT = "110deg";
/** Where across the band the highlight is brightest: later is a harder leading edge. */
const PEAK = 0.85;
/** Stops per ramp — enough for an eased curve to read as one, with no banding. */
const STEPS = 12;
/** Every stop ramps on this scrim, so none of them shows as a hard line. */
const ease = (t) => (1 - Math.cos(Math.PI * t)) / 2;
const ANIMATIONS = ["shimmer", "group-shimmer", "pulse", "none"];
const SPEEDS = ["slow", "fast"];
/** The animation an element inherits: `--skullet-animation` and `--skullet-speed`. */
export function motionOf(element) {
    const style = getComputedStyle(element);
    const animation = oneOf(style.getPropertyValue("--skullet-animation").trim(), ANIMATIONS, "shimmer");
    const speed = oneOf(style.getPropertyValue("--skullet-speed").trim(), SPEEDS, "slow");
    const durations = animation === "pulse" ? PULSE_DURATIONS : SHIMMER_DURATIONS;
    return { animation, duration: durations[speed] };
}
/**
 * Puts one bar on the page's single sweep. The delay is the negative of the clock
 * position, so a bar that mounts late joins the sweep already running instead of
 * starting its own.
 */
export function drawShimmer(bar, box, container, motion) {
    bar.style.animationName = "none";
    bar.style.backgroundImage = "";
    if (motion.animation === "none" || prefersReducedMotion())
        return;
    const span = Math.max(container.width, box.width, 1);
    const duration = motion.animation === "pulse"
        ? motion.duration
        : Math.max((motion.duration * span) / REFERENCE_WIDTH, 1);
    const band = Math.min(MAX_BAND, span);
    const period = band * SPACING;
    const image = gradient(band, period);
    bar.style.animationDuration = `${duration}ms`;
    bar.style.animationTimingFunction = "linear";
    bar.style.animationIterationCount = "infinite";
    bar.style.animationDelay = `-${performance.now() % duration}ms`;
    if (motion.animation === "pulse") {
        bar.style.animationName = "skullet-pulse";
        return;
    }
    bar.style.animationName =
        motion.animation === "group-shimmer" ? "skullet-group-shimmer" : "skullet-shimmer";
    bar.style.backgroundImage = image;
    if (motion.animation === "group-shimmer") {
        // One band across the whole skeleton: the gradient is the container's size, and each
        // bar looks through a window at its own place in it, so the sweep crosses them all.
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
/** A band every `period`, eased up to a peak and back, so the sweep reads as one motion. */
function gradient(band, period) {
    const stop = (at, alpha) => `color-mix(in srgb, var(--skullet-highlight) ${(alpha * 100).toFixed(1)}%, transparent) ${(at * band).toFixed(2)}px`;
    const stops = [];
    for (let step = 0; step <= STEPS; step++) {
        stops.push(stop((step / STEPS) * PEAK, ease(step / STEPS)));
    }
    for (let step = 1; step <= STEPS; step++) {
        stops.push(stop(PEAK + (step / STEPS) * (1 - PEAK), ease(1 - step / STEPS)));
    }
    stops.push(`transparent ${period.toFixed(2)}px`);
    return `repeating-linear-gradient(${SLANT}, ${stops.join(", ")})`;
}
function oneOf(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
}
