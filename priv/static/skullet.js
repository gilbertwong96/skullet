import { SkulletEngine } from "./engine.js";
export { setDebug } from "./engine.js";
// A plain page (and the pre-paint tests) can reach the engine without a bundler.
window.__skulletEngine = { attach };
/** The engine for one `.skullet` root: what the hook drives, and what a plain page can. */
export function attach(root) {
    const engine = new SkulletEngine(root);
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
