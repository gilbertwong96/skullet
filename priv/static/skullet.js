import { SkulletEngine } from "./engine.js";
export { setDebug } from "./engine.js";
export { registerReveal } from "./registry.js";
// A plain page (and the pre-paint tests) can reach the engine without a bundler.
window.__skulletEngine = { attach };
/** The engine for one `.skullet` root: what the hook drives, and what a plain page can. */
/**
 * Starts the engine on one skeleton. `options.reveal` takes a spec — or the name of one
 * registered with `registerReveal/2` — and wins over the element's `reveal` attribute.
 */
export function attach(root, options = {}) {
    const engine = new SkulletEngine(root, options);
    engine.start();
    return engine;
}
export const SkulletHook = {
    mounted() {
        this.engine = attach(this.el);
    },
    beforeUpdate() {
        this.engine?.beforeUpdate();
    },
    updated() {
        this.engine?.update();
    },
    destroyed() {
        this.engine?.destroy();
    }
};
