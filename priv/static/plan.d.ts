/** Where one piece of a reveal sits: a piece of content arriving, or a bar of the skeleton leaving. */
export type Piece = {
    rect: DOMRect;
    /** Its row or card: the nearest ancestor with two or more siblings like it. */
    unit: DOMRect | null;
    /** Smaller text than the largest in its unit. */
    secondary: boolean;
    /** The whole reveal. */
    reveal: DOMRect;
    /** ms since the first of the reveals landing alongside this one. */
    late: number;
};
/** What a reveal knows as its content lands, for `choose`. */
export type RevealContext = {
    /** ms the skeleton was up; Infinity when it was never shown. */
    waited: number;
    /** Someone scrolled, touched or typed in the last 400ms. */
    input: boolean;
    /** The skeleton was drawn from the data on screen. */
    refetch: boolean;
    /** ms a skeleton waits before showing — the spec's `hold`, or `--skullet-hold`. */
    hold: number;
    height: number;
    /** How many pieces the content arrives in. */
    pieces: number;
};
/**
 * How content replaces its skeleton. The built-in modes are these objects, and what
 * `choose` returns wins over the fields beside it.
 */
/** What an order needs to know from the theme: the cascade's length, and how late small text follows. */
export type RevealSettings = {
    cascade: number;
    secondaryDelay: number;
};
export type Order = (piece: Piece, settings: RevealSettings) => number | null;
/** A front crossing the whole reveal, drawn each frame from progress 0 to 1. */
export type Wipe = {
    /** The incoming pane's `mask-image` at `progress`. */
    mask: (progress: number, pane: WipePane) => string;
    /** The outgoing skeleton's; the reveal crossfades it out when left out. */
    out?: (progress: number, pane: WipePane) => string;
};
/** One pane under a wipe: its own box, and the box the front crosses, both in viewport px. */
export type WipePane = {
    rect: DOMRect;
    reveal: DOMRect;
};
export type RevealSpec = {
    /** When each piece appears, in ms; null to appear at once. `"together"` for all at once. */
    order?: "together" | Order;
    /** Where each piece starts from, on top of the fade: `{ filter: "blur(6px)" }`. */
    enter?: Keyframe;
    /** A front crossing the whole reveal: the built-in sweep. */
    sweep?: boolean;
    /** Your own front, drawn as a mask on the pane and, if you say so, on the skeleton. */
    wipe?: Wipe;
    delay?: number;
    /** 0 is instant. */
    duration?: number;
    /** ms a skeleton waits before it shows, so data that beats it never shows one. */
    hold?: number;
    choose?: (context: RevealContext) => RevealSpec;
};
/** A named built-in, or a spec of your own. */
export type RevealMode = "instant" | "together" | "sequence" | "sweep" | "smart" | RevealSpec;
export type Plan = {
    kind: "instant";
} | {
    kind: "together";
    delay: number;
    duration: number;
    enter?: Keyframe;
} | {
    kind: "sequence";
    order: Order;
    delay: number;
    duration: number;
    enter?: Keyframe;
} | {
    kind: "sweep";
    delay: number;
    duration: number;
} | {
    kind: "wipe";
    wipe: Wipe;
    delay: number;
    duration: number;
};
/** A skeleton up for less than this is a flash — `smart` holds it back. */
export declare const SKELETON_DELAY: 150;
/** A custom order's latest piece, and the longest any reveal runs. */
export declare const MAX_DELAY = 1000;
export declare const MAX_DURATION = 1000;
/** A wipe bigger than this many screens crossfades instead: the front would be mostly off screen. */
export declare const MAX_WIPE_AREA = 1.5;
/** What a reveal brings in one by one: anything holding text or media of its own. */
export declare function pieces(root: Element): Element[];
/** Its row or card: the nearest ancestor with two or more siblings like it. */
export declare function unitOf(piece: Element, root: Element): Element;
export type ContentPiece = {
    element: Element;
    piece: Piece;
    order: number;
};
/**
 * Times each piece of the content by `order`, in viewport coordinates, with `late` shared
 * by the reveals that landed together.
 */
export declare function timePieces(content: Element, reveal: DOMRect, order: Order, settings: RevealSettings, late: number): ContentPiece[];
/** The bar's piece: the unit that contains it, if any. */
export declare function barPiece(rect: DOMRect, reveal: DOMRect, units: DOMRect[], late: number): Piece;
export declare const instant: RevealSpec;
export declare const together: RevealSpec;
export declare const sequence: RevealSpec;
export declare const sweep: RevealSpec;
/** `sequence`: each piece timed by its place in the reveal, top to bottom, then a little left to right. */
export declare function byPosition({ rect, reveal }: Piece, { cascade }: RevealSettings): number;
/**
 * `smart`'s order: rows arrive whole, in page order, on screen only, main text first.
 * Timed against the screen rather than the reveal, so reveals landing together read as one page.
 */
export declare const byRow: ({ rect, unit, secondary, late }: Piece, { cascade, secondaryDelay }: RevealSettings) => number | null;
/** `together` for a small reveal, else rows cascading down the page. */
export declare const byContent: (context: RevealContext) => RevealSpec;
/** The cases `smart` settles before looking at the content: instant, or a quick crossfade. */
export declare const quickly: (context: RevealContext) => RevealSpec | null;
/** Picks how each reveal happens from how it loaded and what it holds. */
export declare const smart: RevealSpec;
/** A built-in by name, a registered one, or a spec as it is. */
export declare function revealSpec(mode: RevealMode | string | null | undefined): RevealSpec;
export type RevealDefaults = {
    duration: number;
    delay: number;
    enter?: Keyframe;
};
/** Turns a spec into the plan to run, now that the content is here. */
export declare function planReveal(spec: RevealSpec, context: RevealContext, defaults: RevealDefaults): Plan;
