import { type EngineOptions, SkulletEngine } from "./engine.js";
export { setDebug } from "./engine.js";
export { registerReveal } from "./registry.js";
export type { Piece, Plan, RevealContext, RevealMode, RevealSpec, Wipe, WipePane } from "./plan.js";
declare global {
    interface Window {
        __skulletEngine?: {
            attach: typeof attach;
        };
    }
}
/** The engine for one `.skullet` root: what the hook drives, and what a plain page can. */
/**
 * Starts the engine on one skeleton. `options.reveal` takes a spec — or the name of one
 * registered with `registerReveal/2` — and wins over the element's `reveal` attribute.
 */
export declare function attach(root: Element, options?: EngineOptions): SkulletEngine;
type HookContext = {
    el: Element;
    engine?: SkulletEngine;
};
export declare const SkulletHook: {
    mounted(this: HookContext): void;
    beforeUpdate(this: HookContext): void;
    updated(this: HookContext): void;
    destroyed(this: HookContext): void;
};
