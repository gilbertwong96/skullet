import type { RevealSpec } from "./plan.js";
/**
 * Names a reveal spec, so a skeleton can ask for it by name: `data-skullet-reveal="mine"`,
 * or `attach(root, { reveal: "mine" })`. Names are page-wide, so register once at start-up.
 */
export declare function registerReveal(name: string, spec: RevealSpec): void;
export declare function registeredReveal(name: string): RevealSpec | undefined;
