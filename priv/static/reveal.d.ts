/** A skeleton waits this long before showing, so fast data never shows one. */
export declare const HOLD_MS = 150;
export declare const FADE_MS = 200;
export declare const RESIZE_MS = 280;
export declare function prefersReducedMotion(): boolean;
export declare function fadeIn(element: HTMLElement, duration: number): Animation;
export declare function fadeOut(element: HTMLElement, duration: number): Animation;
/** The reveal easing to its new height, when the sample guessed the content wrong. */
export declare function easeHeight(element: HTMLElement, from: number, to: number, duration: number): Animation | null;
/**
 * Whatever happened, the element keeps no inline height, overflow or opacity, and no
 * running animation: a patch that never lands must not leave the content invisible.
 */
export declare function settle(element: HTMLElement): void;
