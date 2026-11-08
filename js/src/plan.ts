import { DEFAULT_DURATIONS } from "./reveal.js"

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

/** What a reveal knows as its content lands, for `choose`. */
export type RevealContext = {
  /** ms the skeleton was up; Infinity when it was never shown. */
  waited: number
  /** Someone scrolled, touched or typed in the last 400ms. */
  input: boolean
  /** The skeleton was drawn from the data on screen. */
  refetch: boolean
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
  order?: "together" | ((piece: Piece) => number | null)
  /** Where each piece starts from, on top of the fade: `{ filter: "blur(6px)" }`. */
  enter?: Keyframe
  /** A front crossing the whole reveal: the built-in sweep. */
  sweep?: boolean
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
  | {
      kind: "sequence"
      order: (piece: Piece) => number | null
      delay: number
      duration: number
      enter?: Keyframe
    }
  | { kind: "sweep"; delay: number; duration: number }

/** A skeleton up for less than this is a flash — `smart` holds it back. */
export const SKELETON_DELAY = DEFAULT_DURATIONS.hold
const QUICK_FADE = 120
const SMALL_HEIGHT = 72
const SMALL_PIECES = 3
/** A custom order's latest piece, and the longest any reveal runs. */
export const MAX_DELAY = 1000
export const MAX_DURATION = 1000

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max)

export const instant: RevealSpec = { duration: 0 }
export const together: RevealSpec = { order: "together" }
export const sequence: RevealSpec = { order: byPosition }
export const sweep: RevealSpec = { sweep: true }

/** `sequence`: each piece timed by its place in the reveal, top to bottom, then a little left to right. */
export function byPosition({ rect, reveal }: Piece): number {
  const down = (rect.top - reveal.top) / Math.max(reveal.height, 1)
  const across = (rect.left - reveal.left) / Math.max(reveal.width, 1)
  return clamp(down * 0.8 + across * 0.2, 1) * DEFAULT_DURATIONS.sequence
}

/** `together` for a small reveal, else a cascade down the page. */
export const byContent = (context: RevealContext): RevealSpec =>
  context.height < SMALL_HEIGHT || context.pieces <= SMALL_PIECES ? together : { order: byPosition }

/** The cases `smart` settles before looking at the content: instant, or a quick crossfade. */
export const quickly = (context: RevealContext): RevealSpec | null =>
  context.input || context.waited < SKELETON_DELAY
    ? instant
    : context.refetch
      ? { order: "together", duration: QUICK_FADE }
      : null

/** Picks how each reveal happens from how it loaded and what it holds. */
export const smart: RevealSpec = {
  hold: SKELETON_DELAY,
  choose: (context) => quickly(context) ?? byContent(context)
}

const NAMED: Record<string, RevealSpec> = { instant, together, sequence, sweep, smart }

/** A built-in by name, or a spec as it is. */
export function revealSpec(mode: RevealMode | string | null | undefined): RevealSpec {
  if (mode && typeof mode === "object") return mode
  return NAMED[mode ?? "smart"] ?? together
}

/** Turns a spec into the plan to run, now that the content is here. */
export function planReveal(spec: RevealSpec, context: RevealContext, fallback: number): Plan {
  let resolved = spec

  while (resolved.choose) {
    const { choose, ...rest } = resolved
    resolved = { ...rest, ...choose(context) }
  }

  const duration = clamp(resolved.duration ?? fallback, MAX_DURATION)
  const delay = clamp(Math.max(resolved.delay ?? 0, 0), MAX_DELAY)

  if (!duration) return { kind: "instant" }
  if (resolved.sweep) return { kind: "sweep", delay, duration }

  if (typeof resolved.order === "function") {
    return { kind: "sequence", order: resolved.order, delay, duration, enter: resolved.enter }
  }

  return { kind: "together", delay, duration, enter: resolved.enter }
}
