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
/** What an order needs to know from the theme: the cascade's length, and how late small text follows. */
export type RevealSettings = { cascade: number; secondaryDelay: number }

export type Order = (piece: Piece, settings: RevealSettings) => number | null

export type RevealSpec = {
  /** When each piece appears, in ms; null to appear at once. `"together"` for all at once. */
  order?: "together" | Order
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
  | { kind: "sequence"; order: Order; delay: number; duration: number; enter?: Keyframe }
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

/** What a reveal brings in one by one: anything holding text or media of its own. */
export function pieces(root: Element): Element[] {
  const found: Element[] = []

  const visit = (element: Element) => {
    for (const child of element.children) {
      const ownText = [...child.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
      )

      if (!child.firstElementChild || ownText || child.localName === "svg") {
        found.push(child)
      } else {
        visit(child)
      }
    }
  }

  visit(root)
  return found
}

/** Its row or card: the nearest ancestor with two or more siblings like it. */
export function unitOf(piece: Element, root: Element): Element {
  for (
    let element: Element | null = piece;
    element && element !== root;
    element = element.parentElement
  ) {
    const parent = element.parentElement
    if (!parent) break

    const alike = [...parent.children].filter(
      (sibling) =>
        sibling.localName === element!.localName && sibling.className === element!.className
    )

    if (alike.length >= 3) return element
  }

  return piece
}

export type ContentPiece = { element: Element; piece: Piece; order: number }

/**
 * Times each piece of the content by `order`, in viewport coordinates, with `late` shared
 * by the reveals that landed together.
 */
export function timePieces(
  content: Element,
  reveal: DOMRect,
  order: Order,
  settings: RevealSettings,
  late: number
): ContentPiece[] {
  const fontSize = (element: Element) => Number.parseFloat(getComputedStyle(element).fontSize) || 16
  const units = new Map<Element, { rect: DOMRect; size: number }>()

  const piecesIn = pieces(content).map((element) => {
    const unit = unitOf(element, content)
    let found = units.get(unit)

    if (!found) {
      found = { rect: unit.getBoundingClientRect(), size: 0 }
      units.set(unit, found)
    }

    found.size = Math.max(found.size, fontSize(element))
    return { element, unit, size: fontSize(element) }
  })

  return piecesIn.map(({ element, unit, size }) => {
    const piece: Piece = {
      rect: element.getBoundingClientRect(),
      unit: unit.getBoundingClientRect(),
      secondary: size < (units.get(unit)?.size ?? size),
      reveal,
      late
    }

    return { element, piece, order: order(piece, settings) ?? 0 }
  })
}

/** The bar's piece: the unit that contains it, if any. */
export function barPiece(rect: DOMRect, reveal: DOMRect, units: DOMRect[], late: number): Piece {
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2

  const unit =
    units.find((box) => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) ?? null

  const fontSize = unit ? Math.max(rect.height, 1) : rect.height

  return { rect, unit, secondary: unit ? rect.height < fontSize * 0.8 : false, reveal, late }
}

export const instant: RevealSpec = { duration: 0 }
export const together: RevealSpec = { order: "together" }
export const sequence: RevealSpec = { order: byPosition }
export const sweep: RevealSpec = { sweep: true }

/** `sequence`: each piece timed by its place in the reveal, top to bottom, then a little left to right. */
export function byPosition({ rect, reveal }: Piece, { cascade }: RevealSettings): number {
  const down = (rect.top - reveal.top) / Math.max(reveal.height, 1)
  const across = (rect.left - reveal.left) / Math.max(reveal.width, 1)
  return clamp(down * 0.8 + across * 0.2, 1) * cascade
}

const onScreen = (rect: DOMRect) => rect.bottom > 0 && rect.top < innerHeight

/**
 * `smart`'s order: rows arrive whole, in page order, on screen only, main text first.
 * Timed against the screen rather than the reveal, so reveals landing together read as one page.
 */
export const byRow = (
  { rect, unit, secondary, late }: Piece,
  { cascade, secondaryDelay }: RevealSettings
): number | null => {
  if (!unit) return onScreen(rect) ? 0 : null
  if (!onScreen(unit)) return null

  const at = clamp(unit.top / Math.max(innerHeight, 1), 1) * cascade

  return Math.max(at - late, 0) + (secondary ? secondaryDelay : 0)
}

/** `together` for a small reveal, else rows cascading down the page. */
export const byContent = (context: RevealContext): RevealSpec =>
  context.height < SMALL_HEIGHT || context.pieces <= SMALL_PIECES ? together : { order: byRow }

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

export type RevealDefaults = { duration: number; delay: number; enter?: Keyframe }

/** Turns a spec into the plan to run, now that the content is here. */
export function planReveal(
  spec: RevealSpec,
  context: RevealContext,
  defaults: RevealDefaults
): Plan {
  let resolved = spec

  while (resolved.choose) {
    const { choose, ...rest } = resolved
    resolved = { ...rest, ...choose(context) }
  }

  const duration = clamp(resolved.duration ?? defaults.duration, MAX_DURATION)
  const delay = clamp(Math.max(resolved.delay ?? defaults.delay, 0), MAX_DELAY)
  const enter = resolved.enter ?? defaults.enter

  if (!duration) return { kind: "instant" }
  if (resolved.sweep) return { kind: "sweep", delay, duration }

  if (typeof resolved.order === "function") {
    return { kind: "sequence", order: resolved.order, delay, duration, enter }
  }

  return { kind: "together", delay, duration, enter }
}
