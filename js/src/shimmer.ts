import { prefersReducedMotion } from "./reveal.js"

export type Animation = "shimmer" | "pulse" | "none"
export type Motion = { animation: Animation; duration: number }

export const SHIMMER_DURATIONS = { slow: 4000, fast: 2000 } as const
export const PULSE_DURATIONS = { slow: 2400, fast: 1200 } as const
/** One shimmer loop across this width; any other width keeps the same pace. */
export const REFERENCE_WIDTH = 1280
/** The highlight's band, so it doesn't grow heavier on a wide screen. */
export const MAX_BAND = 320
/** Bands follow each other this many band-widths apart, start to start. */
export const SPACING = 2.5
export const SLANT = "110deg"

const ANIMATIONS: readonly Animation[] = ["shimmer", "pulse", "none"]
const SPEEDS = ["slow", "fast"] as const

type Speed = (typeof SPEEDS)[number]

/** The animation an element inherits: `--skullet-animation` and `--skullet-speed`. */
export function motionOf(element: Element): Motion {
  const style = getComputedStyle(element)
  const animation = oneOf(
    style.getPropertyValue("--skullet-animation").trim(),
    ANIMATIONS,
    "shimmer"
  )
  const speed = oneOf(style.getPropertyValue("--skullet-speed").trim(), SPEEDS, "slow")
  const durations = animation === "pulse" ? PULSE_DURATIONS : SHIMMER_DURATIONS

  return { animation, duration: durations[speed] }
}

/**
 * Puts one bar on the page's single sweep. The delay is the negative of the clock
 * position, so a bar that mounts late joins the sweep already running instead of
 * starting its own.
 */
export function drawShimmer(bar: HTMLElement, width: number, motion: Motion): void {
  if (motion.animation === "none" || prefersReducedMotion()) {
    bar.style.animationName = "none"
    bar.style.backgroundImage = ""
    return
  }

  const span = Math.max(width, 1)
  const duration =
    motion.animation === "pulse"
      ? motion.duration
      : Math.max((motion.duration * span) / REFERENCE_WIDTH, 1)

  bar.style.animationName = motion.animation === "pulse" ? "skullet-pulse" : "skullet-shimmer"
  bar.style.animationDuration = `${duration}ms`
  bar.style.animationTimingFunction = "linear"
  bar.style.animationIterationCount = "infinite"
  bar.style.animationDelay = `-${performance.now() % duration}ms`

  if (motion.animation === "shimmer") {
    const band = Math.min(MAX_BAND, span)
    const period = band * SPACING
    bar.style.setProperty("--skullet-band", `${period}px`)
    bar.style.backgroundImage =
      `repeating-linear-gradient(${SLANT}, transparent 0px, ` +
      `var(--skullet-highlight) ${band / 2}px, transparent ${period}px)`
  }
}

function oneOf<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}
