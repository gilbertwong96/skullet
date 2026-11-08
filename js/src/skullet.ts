import { type EngineOptions, SkulletEngine } from "./engine.js"

export { setDebug } from "./engine.js"
export { registerReveal } from "./registry.js"
export type { Piece, Plan, RevealContext, RevealMode, RevealSpec, Wipe, WipePane } from "./plan.js"

declare global {
  interface Window {
    __skulletEngine?: { attach: typeof attach }
  }
}

// A plain page (and the pre-paint tests) can reach the engine without a bundler.
window.__skulletEngine = { attach }

/** The engine for one `.skullet` root: what the hook drives, and what a plain page can. */
/**
 * Starts the engine on one skeleton. `options.reveal` takes a spec — or the name of one
 * registered with `registerReveal/2` — and wins over the element's `reveal` attribute.
 */
export function attach(root: Element, options: EngineOptions = {}): SkulletEngine {
  const engine = new SkulletEngine(root, options)
  engine.start()
  return engine
}

type HookContext = { el: Element; engine?: SkulletEngine }

export const SkulletHook = {
  mounted(this: HookContext) {
    this.engine = attach(this.el)
  },
  beforeUpdate(this: HookContext) {
    this.engine?.beforeUpdate()
  },
  updated(this: HookContext) {
    this.engine?.update()
  },
  destroyed(this: HookContext) {
    this.engine?.destroy()
  }
}
