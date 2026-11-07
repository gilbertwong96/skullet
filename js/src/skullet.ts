import { SkulletEngine } from "./engine.js"

export { setDebug } from "./engine.js"

declare global {
  interface Window {
    __skulletEngine?: { attach: typeof attach }
  }
}

// A plain page (and the pre-paint tests) can reach the engine without a bundler.
window.__skulletEngine = { attach }

/** The engine for one `.skullet` root: what the hook drives, and what a plain page can. */
export function attach(root: Element): SkulletEngine {
  const engine = new SkulletEngine(root)
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
