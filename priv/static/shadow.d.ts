export type Shadow = {
    bars: HTMLElement;
};
/** The overlay's shadow root, made once and reused by the pre-paint script and the engine. */
export declare function attachShadow(overlay: HTMLElement): Shadow;
