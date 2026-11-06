import { measure, type Rect } from "./measure.js"
import { barBox } from "./metrics.js"
import { drawShimmer, motionOf } from "./shimmer.js"
import {
  FADE_MS,
  HOLD_MS,
  RESIZE_MS,
  easeHeight,
  fadeIn,
  fadeOut,
  prefersReducedMotion,
  settle
} from "./reveal.js"

const SHADOW_CSS = `:host{display:block;position:absolute;inset:0;overflow:hidden;pointer-events:none}
[data-skullet-bars]{position:absolute;inset:0}
[data-skullet-bar]{position:absolute;left:0;top:0;background:var(--skullet-base);border-radius:var(--skullet-radius)}
@keyframes skullet-shimmer{from{background-position-x:0}to{background-position-x:var(--skullet-band)}}
@keyframes skullet-pulse{0%,100%{opacity:1}50%{opacity:0.45}}`

export function stateOf(root: Element): string {
  return root.getAttribute("data-skullet-state") ?? "loading"
}

type Phase = "holding" | "bars"
type Pass = "instant" | "fade"

export class SkulletEngine {
  readonly root: HTMLElement

  private readonly content: HTMLElement | null
  private overlay: HTMLElement | null = null
  private bars: HTMLElement | null = null
  private frame = 0
  private started = false
  private resizes: ResizeObserver[] = []
  private mutations: MutationObserver | null = null
  private state = "loading"
  private phase: Phase | null = null
  private pass: Pass = "instant"
  private pinned = 0
  private holdTimer = 0
  private safetyTimer = 0
  private easing = false

  constructor(root: Element) {
    this.root = root as HTMLElement
    this.content = root.querySelector<HTMLElement>("[data-skullet-content]")
  }

  start(): void {
    if (this.started) return
    this.started = true

    const content = this.content
    if (!content) return

    this.state = stateOf(this.root)
    if (this.state === "loading") this.show()
    this.observe(content)
  }

  /** Runs before LiveView patches the content in: the last moment the old shape exists. */
  beforeUpdate(): void {
    if (!this.started) return
    this.state = stateOf(this.root)

    if (this.state !== "loading" || this.phase !== "bars" || this.instant) {
      this.pass = "instant"
      return
    }

    this.pass = "fade"
    this.pinned = this.root.getBoundingClientRect().height
    this.root.style.height = `${this.pinned}px`
    this.root.style.overflow = "hidden"
    if (this.content) fadeIn(this.content, FADE_MS)

    this.safetyTimer = window.setTimeout(() => {
      this.safetyTimer = 0
      this.release()
    }, FADE_MS + 200)
  }

  /** Runs after the patch: reveal what arrived, or start over. */
  update(): void {
    if (!this.started) return

    const next = stateOf(this.root)
    const previous = this.state
    this.state = next

    if (next === "loaded") {
      this.reveal()
    } else if (next === "failed") {
      this.stop()
    } else {
      this.pass = "instant"
      this.clearSafety()
      this.release()

      if (previous === "loaded") this.show()
      else this.schedule()
    }
  }

  destroy(): void {
    this.clearHold()
    this.clearSafety()
    if (this.frame) cancelAnimationFrame(this.frame)
    this.frame = 0

    for (const resize of this.resizes) resize.disconnect()
    this.resizes = []
    this.mutations?.disconnect()
    this.mutations = null

    this.phase = null
    this.root.removeAttribute("data-skullet-phase")
    this.overlay?.remove()
    this.overlay = null
    this.bars = null
    this.release()
    this.started = false
  }

  private get instant(): boolean {
    return this.root.getAttribute("data-skullet-reveal") === "instant" || prefersReducedMotion()
  }

  private show(): void {
    if (this.state !== "loading") return

    this.createOverlay()
    this.pass = "instant"
    this.easing = false

    if (this.instant) {
      this.showBars()
    } else {
      this.phase = "holding"
      this.root.setAttribute("data-skullet-phase", "holding")
      if (this.overlay) this.overlay.style.opacity = "0"

      this.holdTimer = window.setTimeout(() => {
        this.holdTimer = 0
        if (this.phase === "holding") this.showBars()
      }, HOLD_MS)
    }

    this.schedule()
  }

  private showBars(): void {
    this.phase = "bars"
    this.root.setAttribute("data-skullet-phase", "bars")
    if (this.overlay) this.overlay.style.opacity = "1"
    this.schedule()
  }

  private reveal(): void {
    this.clearHold()

    const fade = this.pass === "fade" && !this.instant
    this.pass = "instant"
    this.phase = null
    this.root.removeAttribute("data-skullet-phase")

    const overlay = this.overlay
    if (!overlay || !fade) {
      this.hideOverlay()
      this.clearSafety()
      this.release()
      return
    }

    const target = this.content ? this.content.getBoundingClientRect().height : this.pinned
    const fadeOutAnimation = fadeOut(overlay, FADE_MS)
    this.easing = true

    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      this.easing = false
      this.clearSafety()
      this.hideOverlay()
      this.release()
    }

    const ease = easeHeight(this.root, this.pinned, target, RESIZE_MS)
    const settled_at = ease ?? fadeOutAnimation
    settled_at.finished.then(finish, finish)
  }

  private stop(): void {
    this.clearHold()
    this.clearSafety()
    this.phase = null
    this.root.removeAttribute("data-skullet-phase")
    this.overlay?.remove()
    this.overlay = null
    this.bars = null
    this.release()
  }

  private hideOverlay(): void {
    this.bars?.replaceChildren()
    if (this.overlay) this.overlay.style.opacity = "0"
  }

  private release(): void {
    settle(this.root)
    if (this.content) settle(this.content)
  }

  private createOverlay(): void {
    if (this.overlay) return

    const overlay = document.createElement("div")
    overlay.setAttribute("data-skullet-overlay", "")
    overlay.setAttribute("aria-hidden", "true")

    const shadow = overlay.attachShadow({ mode: "open" })
    const style = document.createElement("style")
    style.textContent = SHADOW_CSS
    const bars = document.createElement("div")
    bars.setAttribute("data-skullet-bars", "")
    shadow.append(style, bars)

    this.root.append(overlay)
    this.overlay = overlay
    this.bars = bars
  }

  private observe(content: HTMLElement): void {
    const resize = new ResizeObserver(() => {
      if (this.easing) return
      this.schedule()
    })
    resize.observe(this.root)
    resize.observe(content)
    this.resizes.push(resize)

    this.mutations = new MutationObserver(() => this.schedule())
    this.mutations.observe(content, { childList: true, subtree: true, characterData: true })

    document.fonts?.ready.then(() => this.schedule())

    for (const image of content.querySelectorAll("img")) {
      if (!image.complete) image.addEventListener("load", () => this.schedule(), { once: true })
    }
  }

  private clearHold(): void {
    if (!this.holdTimer) return
    clearTimeout(this.holdTimer)
    this.holdTimer = 0
  }

  private clearSafety(): void {
    if (!this.safetyTimer) return
    clearTimeout(this.safetyTimer)
    this.safetyTimer = 0
  }

  private schedule(): void {
    if (this.frame) return

    this.frame = requestAnimationFrame(() => {
      this.frame = 0
      this.draw()
    })
  }

  private draw(): void {
    const { content, overlay, bars } = this
    if (!content || !overlay || !bars) return
    if (stateOf(this.root) !== "loading") return

    const { lines, blocks } = measure(content, overlay)
    const rects: Rect[] = [...blocks]

    for (const line of lines) {
      const box = barBox(line)
      rects.push({ x: line.x, y: box.y, width: line.width, height: box.height })
    }

    const motion = motionOf(this.root)
    const width = this.root.getBoundingClientRect().width
    const fragment = document.createDocumentFragment()

    for (const rect of rects) {
      const bar = createBar(rect)
      drawShimmer(bar, width, motion)
      fragment.append(bar)
    }

    bars.replaceChildren(fragment)
  }
}

function createBar(rect: Rect): HTMLElement {
  const bar = document.createElement("span")
  bar.setAttribute("data-skullet-bar", "")
  bar.style.cssText = `width:${rect.width}px;height:${rect.height}px;transform:translate(${rect.x}px,${rect.y}px)`
  return bar
}
