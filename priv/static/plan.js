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
/** What a reveal brings in one by one: anything holding text or media of its own. */
export function pieces(root) {
    const found = [];
    const visit = (element) => {
        for (const child of element.children) {
            const ownText = [...child.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
            if (!child.firstElementChild || ownText || child.localName === "svg") {
                found.push(child);
            }
            else {
                visit(child);
            }
        }
    };
    visit(root);
    return found;
}
/** Its row or card: the nearest ancestor with two or more siblings like it. */
export function unitOf(piece, root) {
    for (let element = piece; element && element !== root; element = element.parentElement) {
        const parent = element.parentElement;
        if (!parent)
            break;
        const alike = [...parent.children].filter((sibling) => sibling.localName === element.localName && sibling.className === element.className);
        if (alike.length >= 3)
            return element;
    }
    return piece;
}
/**
 * Times each piece of the content by `order`, in viewport coordinates, with `late` shared
 * by the reveals that landed together.
 */
export function timePieces(content, reveal, order, late) {
    const fontSize = (element) => Number.parseFloat(getComputedStyle(element).fontSize) || 16;
    const units = new Map();
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
        return { element, piece, order: order(piece) ?? 0 };
    });
}
/** The bar's piece: the unit that contains it, if any. */
export function barPiece(rect, reveal, units, late) {
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const unit = units.find((box) => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) ?? null;
    const fontSize = unit ? Math.max(rect.height, 1) : rect.height;
    return { rect, unit, secondary: unit ? rect.height < fontSize * 0.8 : false, reveal, late };
}
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
