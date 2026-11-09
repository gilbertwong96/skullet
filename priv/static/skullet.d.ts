/**
 * What `priv/static/skullet.js` exports, written by hand so the package ships one file
 * instead of a declaration per source module. The types mirror `js/src/plan.ts`.
 */

/** Where one piece of a reveal sits: a piece of content arriving, or a bar of the skeleton leaving. */
export type Piece = {
  rect: DOMRect
  /** Its row or card: the nearest ancestor with two or more siblings like it. */
  unit: DOMRect | null
  /** Smaller text than the largest in its unit. */
  secondary: boolean
  /** The whole reveal. */
  reveal: DOMRect
  /** ms since the first of the reveals landing alongside this one. */
  late: number
}

/** What an order needs to know from the theme: the cascade's length, and how late small text follows. */
export type RevealSettings = {
  cascade: number
  secondaryDelay: number
}

export type Order = (piece: Piece, settings: RevealSettings) => number | null

/** One pane under a wipe: its own box, and the box the front crosses, both in viewport px. */
export type WipePane = {
  rect: DOMRect
  reveal: DOMRect
}

/** A front crossing the whole reveal, drawn each frame from progress 0 to 1. */
export type Wipe = {
  /** The incoming pane's `mask-image` at `progress`. */
  mask: (progress: number, pane: WipePane) => string
  /** The outgoing skeleton's; the reveal crossfades it out when left out. */
  out?: (progress: number, pane: WipePane) => string
}

/** What a reveal knows as its content lands, for `choose`. */
export type RevealContext = {
  /** ms the skeleton was up; Infinity when it was never shown. */
  waited: number
  /** Someone scrolled, touched or typed in the last 400ms. */
  input: boolean
  /** The skeleton was drawn from the data on screen. */
  refetch: boolean
  /** ms a skeleton waits before showing — the spec's `hold`, or `--skullet-hold`. */
  hold: number
  height: number
  /** How many pieces the content arrives in. */
  pieces: number
}

/**
 * How content replaces its skeleton. The built-in modes are these objects, and what
 * `choose` returns wins over the fields beside it.
 */
export type RevealSpec = {
  /** When each piece appears, in ms; null to appear at once. `"together"` for all at once. */
  order?: "together" | Order
  /** Where each piece starts from, on top of the fade: `{ filter: "blur(6px)" }`. */
  enter?: Keyframe
  /** A front crossing the whole reveal: the built-in sweep. */
  sweep?: boolean
  /** Your own front, drawn as a mask on the pane and, if you say so, on the skeleton. */
  wipe?: Wipe
  delay?: number
  /** 0 is instant. */
  duration?: number
  /** ms a skeleton waits before it shows, so data that beats it never shows one. */
  hold?: number
  choose?: (context: RevealContext) => RevealSpec
}

/** A named built-in, or a spec of your own. */
export type RevealMode = "instant" | "together" | "sequence" | "sweep" | "smart" | RevealSpec

export type Plan =
  | { kind: "instant" }
  | { kind: "together"; delay: number; duration: number; enter?: Keyframe }
  | { kind: "sequence"; order: Order; delay: number; duration: number; enter?: Keyframe }
  | { kind: "sweep"; delay: number; duration: number }
  | { kind: "wipe"; wipe: Wipe; delay: number; duration: number }

export type EngineOptions = { reveal?: RevealSpec }

/** The engine for one `.skullet` root: what the hook drives, and what a plain page can. */
export declare class SkulletEngine {
  readonly root: HTMLElement
  constructor(root: Element, options?: EngineOptions)
  start(): void
  /** Runs before LiveView patches the content in: the last moment the old shape exists. */
  beforeUpdate(): void
  /** Runs after the patch: reveal what arrived, or start over. */
  update(): void
  destroy(): void
}

/**
 * Starts the engine on one skeleton. `options.reveal` takes a spec — or the name of one
 * registered with `registerReveal/2` — and wins over the element's `reveal` attribute.
 */
export declare function attach(root: Element, options?: EngineOptions): SkulletEngine

/** Turns the overlay on or off for the whole page, from a console or a devtool. */
export declare function setDebug(on: boolean): void

/**
 * Names a reveal spec, so a skeleton can ask for it by name: `data-skullet-reveal="mine"`,
 * or `attach(root, { reveal: "mine" })`. Names are page-wide, so register once at start-up.
 */
export declare function registerReveal(name: string, spec: RevealSpec): void

/** The `phx-hook="Skullet"` object LiveView mounts on each skeleton. */
export declare const SkulletHook: {
  mounted(this: { el: Element }): void
  beforeUpdate(this: { el: Element }): void
  updated(this: { el: Element }): void
  destroyed(this: { el: Element }): void
}

declare global {
  interface Window {
    __skulletEngine?: { attach: typeof attach; measure: (content: Element, overlay: Element) => unknown }
  }
}
