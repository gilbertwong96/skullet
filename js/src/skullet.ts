import { SkulletEngine } from "./engine.js"

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
