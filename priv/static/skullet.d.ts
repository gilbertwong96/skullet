import { SkulletEngine } from "./engine.js";
export { setDebug } from "./engine.js";
declare global {
    interface Window {
        __skulletEngine?: {
            attach: typeof attach;
        };
    }
}
/** The engine for one `.skullet` root: what the hook drives, and what a plain page can. */
export declare function attach(root: Element): SkulletEngine;
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
