import { DEFAULT_DURATIONS } from "./reveal.js";
/** A skeleton up for less than this is a flash — `smart` holds it back. */
export const SKELETON_DELAY = DEFAULT_DURATIONS.hold;
const QUICK_FADE = 120;
const SMALL_HEIGHT = 72;
const SMALL_PIECES = 3;
/** A custom order's latest piece, and the longest any reveal runs. */
export const MAX_DELAY = 1000;
export const MAX_DURATION = 1000;
const clamp = (value, max) => Math.min(Math.max(value, 0), max);
export const instant = { duration: 0 };
export const together = { order: "together" };
export const sequence = { order: byPosition };
export const sweep = { sweep: true };
/** `sequence`: each piece timed by its place in the reveal, top to bottom, then a little left to right. */
export function byPosition({ rect, reveal }) {
    const down = (rect.top - reveal.top) / Math.max(reveal.height, 1);
    const across = (rect.left - reveal.left) / Math.max(reveal.width, 1);
    return clamp(down * 0.8 + across * 0.2, 1) * DEFAULT_DURATIONS.sequence;
}
/** `together` for a small reveal, else a cascade down the page. */
export const byContent = (context) => context.height < SMALL_HEIGHT || context.pieces <= SMALL_PIECES ? together : { order: byPosition };
/** The cases `smart` settles before looking at the content: instant, or a quick crossfade. */
export const quickly = (context) => context.input || context.waited < SKELETON_DELAY
    ? instant
    : context.refetch
        ? { order: "together", duration: QUICK_FADE }
        : null;
/** Picks how each reveal happens from how it loaded and what it holds. */
export const smart = {
    hold: SKELETON_DELAY,
    choose: (context) => quickly(context) ?? byContent(context)
};
const NAMED = { instant, together, sequence, sweep, smart };
/** A built-in by name, or a spec as it is. */
export function revealSpec(mode) {
    if (mode && typeof mode === "object")
        return mode;
    return NAMED[mode ?? "smart"] ?? together;
}
/** Turns a spec into the plan to run, now that the content is here. */
export function planReveal(spec, context, fallback) {
    let resolved = spec;
    while (resolved.choose) {
        const { choose, ...rest } = resolved;
        resolved = { ...rest, ...choose(context) };
    }
    const duration = clamp(resolved.duration ?? fallback, MAX_DURATION);
    const delay = clamp(Math.max(resolved.delay ?? 0, 0), MAX_DELAY);
    if (!duration)
        return { kind: "instant" };
    if (resolved.sweep)
        return { kind: "sweep", delay, duration };
    if (typeof resolved.order === "function") {
        return { kind: "sequence", order: resolved.order, delay, duration, enter: resolved.enter };
    }
    return { kind: "together", delay, duration, enter: resolved.enter };
}
