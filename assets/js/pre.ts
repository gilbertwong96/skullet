import { measure } from "./measure.js"
import { barBox } from "./metrics.js"
import { drawShimmer, motionOf } from "./shimmer.js"
import { durationsOf } from "./reveal.js"
import { attachShadow } from "./shadow.js"
import { createBar } from "./bar.js"

/**
 * Paints the skeletons already in the server's HTML, synchronously, so the bars are there
 * for the browser's first paint instead of appearing once the bundle has loaded and the
 * LiveView has mounted.
 *
 * Built as a self-contained IIFE (`priv/static/skullet.pre.js`) and inlined by
 * `<Skullet.Boot />`; it shares the geometry, metrics and shimmer code with the engine,
 * so what it draws is what the engine would have drawn.
 */
function paint(root: HTMLElement): void {
  if (root.getAttribute("data-skullet-state") !== "loading") return

  const content = root.querySelector<HTMLElement>("[data-skullet-content]")
  const overlay = root.querySelector<HTMLElement>("[data-skullet-overlay]")
  if (!content || !overlay) return

  const { bars } = attachShadow(overlay)
  const host = root.getBoundingClientRect()
  const container = { width: host.width, height: host.height }
  const motion = motionOf(root)
  const { lines, blocks } = measure(content, overlay)

  const fragment = document.createDocumentFragment()

  for (const rect of blocks) {
    const bar = createBar(rect)
    drawShimmer(bar, rect, container, motion)
    fragment.append(bar)
  }

  for (const line of lines) {
    const box = barBox(line)
    const rect = { x: line.x, y: box.y, width: line.width, height: box.height }
    const bar = createBar(rect)
    drawShimmer(bar, rect, container, motion)
    fragment.append(bar)
  }

  bars.replaceChildren(fragment)

  // The same hold the engine uses, done in CSS: fast data never flashes a skeleton.
  const hold = durationsOf(root).hold

  if (hold > 0) {
    bars.setAttribute("data-skullet-phase", "holding")
    bars.style.setProperty("--skullet-pre-hold", `${hold}ms`)
    bars.style.animation = "skullet-pre-hold 0s var(--skullet-pre-hold) forwards"
  } else {
    bars.setAttribute("data-skullet-phase", "bars")
  }
}

export function boot(): void {
  document.documentElement.classList.add("skullet-js")

  for (const root of document.querySelectorAll<HTMLElement>(
    ".skullet[data-skullet-state='loading']"
  )) {
    paint(root)
  }
}
