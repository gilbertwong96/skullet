import { type EngineOptions, SkulletEngine } from "./engine.js"
import { measure } from "./measure.js"

export { createSkeletonBox } from "./box.js"
export type { SkeletonBoxOptions } from "./box.js"
export { setDebug } from "./engine.js"
export { registerReveal } from "./registry.js"
export type { Piece, Plan, RevealContext, RevealMode, RevealSpec, Wipe, WipePane } from "./plan.js"

declare global {
  interface Window {
    __skulletEngine?: { attach: typeof attach; measure: typeof measure }
  }
}

// A plain page (and the fixtures) can reach the engine without a bundler. Guarded: the
// module is imported by a bundler that may evaluate it outside a browser (SSR, tooling).
if (typeof window !== "undefined") window.__skulletEngine = { attach, measure }

/** The engine for one `.skullet` root: what the hook drives, and what a plain page can. */
// One engine per root: a page that attaches twice (a retried script, a hook and a manual
// call) would otherwise run two sets of observers and timers over the same overlay.
const attached = new WeakMap<Element, SkulletEngine>()

/**
 * Starts the engine on one skeleton. `options.reveal` takes a spec — or the name of one
 * registered with `registerReveal/2` — and wins over the element's `reveal` attribute.
 *
 * Attaching a root that already has a running engine returns that engine and leaves its
 * options alone.
 */
export function attach(root: Element, options: EngineOptions = {}): SkulletEngine {
  const running = attached.get(root)
  if (running?.active) return running

  const engine = new SkulletEngine(root, options)
  attached.set(root, engine)
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
