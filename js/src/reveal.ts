/** A skeleton waits this long before showing, so fast data never shows one. */
export const HOLD_MS = 150
export const FADE_MS = 200
export const RESIZE_MS = 280

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches
}

export function fadeIn(element: HTMLElement, duration: number): Animation {
  return element.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration,
    easing: "ease",
    fill: "forwards"
  })
}

/** The reveal easing to its new height, when the sample guessed the content wrong. */
export function easeHeight(
  element: HTMLElement,
  from: number,
  to: number,
  duration: number
): Animation | null {
  if (Math.abs(to - from) < 1) return null

  return element.animate([{ height: `${from}px` }, { height: `${to}px` }], {
    duration,
    easing: "ease-in-out",
    fill: "forwards"
  })
}

/**
 * Whatever happened, the element keeps no inline height, overflow or opacity, and no
 * running animation: a patch that never lands must not leave the content invisible.
 */
export function settle(element: HTMLElement): void {
  for (const animation of element.getAnimations()) animation.cancel()

  element.style.removeProperty("height")
  element.style.removeProperty("overflow")
  element.style.removeProperty("opacity")
}
