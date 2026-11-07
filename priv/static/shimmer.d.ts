export type Animation = "shimmer" | "group-shimmer" | "pulse" | "none";
export type Motion = {
    animation: Animation;
    duration: number;
};
export declare const SHIMMER_DURATIONS: {
    readonly slow: 4000;
    readonly fast: 2000;
};
export declare const PULSE_DURATIONS: {
    readonly slow: 2400;
    readonly fast: 1200;
};
/** One shimmer loop across this width; any other width keeps the same pace. */
export declare const REFERENCE_WIDTH = 1280;
/** The highlight's band, so it doesn't grow heavier on a wide screen. */
export declare const MAX_BAND = 320;
/** Bands follow each other this many band-widths apart, start to start. */
export declare const SPACING = 2.5;
export declare const SLANT = "110deg";
export type Box = {
    x: number;
    y: number;
    width: number;
    height: number;
};
/** The animation an element inherits: `--skullet-animation` and `--skullet-speed`. */
export declare function motionOf(element: Element): Motion;
/**
 * Puts one bar on the page's single sweep. The delay is the negative of the clock
 * position, so a bar that mounts late joins the sweep already running instead of
 * starting its own.
 */
export declare function drawShimmer(bar: HTMLElement, box: Box, container: {
    width: number;
    height: number;
}, motion: Motion): void;
