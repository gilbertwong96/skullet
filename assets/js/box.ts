export type SkeletonBoxOptions = {
  /** Any CSS length, or a number of pixels. 60% by default, like `<Skullet.box>`. */
  width?: number | string
  /** Any CSS length, or a number of pixels. 1em by default. */
  height?: number | string
  /** Any CSS length, or a number of pixels; the theme's radius when left out. */
  radius?: number | string
}

const length = (value: number | string): string =>
  typeof value === "number" ? `${value}px` : value

/**
 * The placeholder block a plain page cannot get from the server: the same `skullet-block`
 * span `<Skullet.box>` renders, sized through the CSSOM — which no Content Security Policy
 * blocks, so it needs no nonce and no stylesheet of its own.
 *
 *     import { attach, createSkeletonBox } from "skullet"
 *     document.querySelector("[data-chart]").append(createSkeletonBox({ width: 240, height: 120 }))
 */
export function createSkeletonBox(options: SkeletonBoxOptions = {}): HTMLSpanElement {
  const box = document.createElement("span")

  box.className = "skullet-box"
  box.setAttribute("skullet-block", "")
  box.style.display = "inline-block"
  box.style.width = length(options.width ?? "60%")
  box.style.height = length(options.height ?? "1em")
  if (options.radius != null) box.style.borderRadius = length(options.radius)

  return box
}
