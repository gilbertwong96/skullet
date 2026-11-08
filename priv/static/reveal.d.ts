/** Defaults for the three timings; every one is a custom property too. */
export declare const DEFAULT_DURATIONS: {
    readonly hold: 150;
    readonly fade: 200;
    readonly resize: 280;
};
export type Durations = {
    hold: number;
    fade: number;
    resize: number;
};
export declare function durationsOf(element: Element): Durations;
/** Longest an undecoded image stays hidden — a stalled request must not hold it back. */
export declare const IMAGE_TIMEOUT_MS = 10000;
export declare function prefersReducedMotion(): boolean;
export declare function fadeIn(element: HTMLElement, duration: number): Animation;
/** The reveal easing to its new height, when the sample guessed the content wrong. */
export declare function easeHeight(element: HTMLElement, from: number, to: number, duration: number): Animation | null;
/**
 * Whatever happened, the element keeps no inline height, overflow or opacity, and no
 * running animation: a patch that never lands must not leave the content invisible.
 */
export declare function settle(element: HTMLElement): void;
