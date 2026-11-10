import type { RevealSpec } from "./plan.js"

const registered = new Map<string, RevealSpec>()

/**
 * Names a reveal spec, so a skeleton can ask for it by name: `data-skullet-reveal="mine"`,
 * or `attach(root, { reveal: "mine" })`. Names are page-wide, so register once at start-up.
 */
export function registerReveal(name: string, spec: RevealSpec): void {
  registered.set(name, spec)
}

export function registeredReveal(name: string): RevealSpec | undefined {
  return registered.get(name)
}
