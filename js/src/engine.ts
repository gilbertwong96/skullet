import { measure, type Rect } from "./measure.js"
import { barBox, resetFontCache } from "./metrics.js"
import { drawShimmer, motionOf } from "./shimmer.js"
import { attachShadow } from "./shadow.js"
import { createBar } from "./bar.js"
import { durationsOf, easeHeight, fadeIn, prefersReducedMotion, settle } from "./reveal.js"

const DEBUG = (() => {
  try {
    return new URLSearchParams(location.search).has("skullet-debug")
  } catch {
    return false
  }
})()

const DEBUG_LOADING = "2px solid #3b82f6"
const DEBUG_STILL = "2px solid #22c55e"
const DEBUG_MOVED = "2px solid #ef4444"

function debugOn(root: Element): boolean {
  return debug || root.hasAttribute("skullet-debug")
}

/** Turns the overlay on or off for the whole page, from a console or a devtool. */
export function setDebug(on: boolean): void {
  debug = on
}

let debug = DEBUG

export function stateOf(root: Element): string {
  return root.getAttribute("data-skullet-state") ?? "loading"
}

type Phase = "holding" | "bars"
type Pass = "instant" | "fade"

export class SkulletEngine {
  readonly root: HTMLElement

  private content: HTMLElement | null
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

    // Every attribute the engine set on the skeleton's own elements would be removed by
    // LiveView's next patch, so the no-JS fallback is switched off on <html> instead.
    document.documentElement.classList.add("skullet-js")

    this.state = stateOf(this.root)
    if (this.state === "loading") this.show()
    this.observe(content)
  }

  /** Runs before LiveView patches the content in: the last moment the old shape exists. */
  beforeUpdate(): void {
    if (!this.started) return
    this.resolve()
    this.state = stateOf(this.root)

    if (this.state !== "loading" || this.phase !== "bars" || this.instant) {
      this.pass = "instant"
      return
    }

    this.pass = "fade"
    this.pinned = this.root.getBoundingClientRect().height
    this.root.style.height = `${this.pinned}px`
    this.root.style.overflow = "hidden"

    // `sequence` and `sweep` animate the skeleton away; the content is simply there.
    const mode = this.root.getAttribute("data-skullet-reveal")
    if (this.content && mode !== "sequence" && mode !== "sweep") {
      fadeIn(this.content, durationsOf(this.root).fade)
    }

    this.safetyTimer = window.setTimeout(
      () => {
        this.safetyTimer = 0
        this.release()
      },
      durationsOf(this.root).fade + 200
    )
  }

  /** Runs after the patch: reveal what arrived, or start over. */
  update(): void {
    if (!this.started) return
    this.resolve()

    const next = stateOf(this.root)
    const previous = this.state
    this.state = next

    if (next === "loaded") {
      // A later patch on an already revealed skeleton must not touch its animations.
      if (previous === "loading") this.reveal()
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
    this.hideOverlay(false)
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

    const prePainted = (this.bars?.children.length ?? 0) > 0

    if (this.instant || prePainted) {
      this.showBars()
    } else {
      this.phase = "holding"
      this.setPhase("holding")

      this.holdTimer = window.setTimeout(() => {
        this.holdTimer = 0
        if (this.phase === "holding") this.showBars()
      }, durationsOf(this.root).hold)
    }

    this.schedule()
  }

  private showBars(): void {
    this.phase = "bars"
    this.setPhase("bars")
    this.schedule()
  }

  /** Phase lives in the shadow root: LiveView patches the light DOM, not this. */
  private setPhase(phase: "holding" | "bars" | null): void {
    if (!this.bars) return

    if (phase) this.bars.setAttribute("data-skullet-phase", phase)
    else this.bars.removeAttribute("data-skullet-phase")
  }

  private reveal(): void {
    this.clearHold()

    const fade = this.pass === "fade" && !this.instant
    this.pass = "instant"
    this.phase = null

    if (!this.overlay || !fade) {
      this.hideOverlay(false)
      this.clearSafety()
      this.release()

      if (this.content) this.markMovement(this.content.getBoundingClientRect().height)
      return
    }

    const target = this.content ? this.content.getBoundingClientRect().height : this.pinned
    const durations = durationsOf(this.root)
    this.easing = true

    const mode = this.root.getAttribute("data-skullet-reveal")

    if (mode === "sequence") this.fadeInSequence(durations.fade)
    else if (mode === "sweep") this.sweepOut(durations.fade)
    else this.hideOverlay(true)

    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      this.easing = false
      this.clearSafety()
      this.release()
      this.markMovement(target)
    }

    const ease = easeHeight(this.root, this.pinned, target, durations.resize)
    if (ease) ease.finished.then(finish, finish)
    else window.setTimeout(finish, durations.fade)
  }

  private stop(): void {
    this.clearHold()
    this.clearSafety()
    this.phase = null
    this.hideOverlay(false)
    this.overlay = null
    this.bars = null
    this.release()
  }

  /** Off is a phase, not an animation: the shadow's transition fades it, and the bars are
   * cleared a beat later — unless a new cycle has already taken the container over. */
  /** `sweep`: a wipe uncovers the content behind the skeleton's front. */
  private sweepOut(duration: number): void {
    const overlay = this.overlay
    const bars = this.bars
    if (!overlay || !bars) return

    bars.style.transition = "none"

    const clear = () => {
      overlay.style.removeProperty("clip-path")
      bars.style.removeProperty("transition")

      if (this.bars === bars && this.phase === null) {
        bars.replaceChildren()
        this.setPhase(null)
      }
    }

    let cleared = false

    const finish = () => {
      if (cleared) return
      cleared = true
      clear()
    }

    const animation = overlay.animate(
      [{ clipPath: "inset(0% 0 0 0)" }, { clipPath: "inset(100% 0 0 0)" }],
      { duration, easing: "ease-in", fill: "forwards" }
    )

    animation.finished.then(finish, finish)
    window.setTimeout(finish, duration + 200)
  }

  /** `sequence`: the bars leave one after another instead of the whole skeleton at once. */
  private fadeInSequence(fade: number): void {
    const bars = this.bars
    if (!bars) return

    const stagger = 30
    const longest = fade + Math.min(bars.children.length * stagger, 600)

    // The container stays opaque; each bar takes itself out, in reading order.
    bars.style.transition = "none"

    for (const [index, bar] of [...bars.children].entries()) {
      const element = bar as HTMLElement
      element.style.transition = `opacity ${fade}ms ease ${Math.min(index * stagger, 600)}ms`
      element.style.opacity = "0"
    }

    window.setTimeout(() => {
      bars.style.removeProperty("transition")

      if (this.bars === bars && this.phase === null) {
        bars.replaceChildren()
        this.setPhase(null)
      }
    }, longest)
  }

  /** Debug: did the reveal move the page? Red with the distance, green when it didn't. */
  private markMovement(revealed: number): void {
    if (!debugOn(this.root)) return

    const moved = Math.abs(revealed - this.pinned)
    this.root.style.outline = moved < 1 ? DEBUG_STILL : DEBUG_MOVED
    this.root.title = moved < 1 ? "skullet: no movement" : `skullet: moved ${moved.toFixed(1)}px`
  }

  private hideOverlay(animate: boolean): void {
    this.setPhase(null)
    const bars = this.bars
    if (!bars) return

    if (!animate) {
      bars.replaceChildren()
      return
    }

    window.setTimeout(() => {
      if (this.bars === bars && this.phase === null) bars.replaceChildren()
    }, durationsOf(this.root).fade)
  }

  private release(): void {
    settle(this.root)
    if (this.content) settle(this.content)
  }

  /**
   * The overlay is server-rendered: LiveView prunes children it does not know about, so
   * an overlay the engine created itself would vanish on the first patch. A plain page
   * may still leave it out; then one is made here.
   */
  /**
   * LiveView reuses nodes positionally: after a structural change the node the engine
   * holds can be a different element, or detached entirely. Both are looked up again by
   * selector before every use, so the engine never measures or draws into a node that is
   * no longer the content pane or the overlay.
   */
  private resolve(): void {
    const content = this.root.querySelector<HTMLElement>("[data-skullet-content]")
    if (content && content !== this.content) this.content = content

    const overlay = this.root.querySelector<HTMLElement>("[data-skullet-overlay]")
    if (overlay && overlay !== this.overlay) {
      this.overlay = overlay
      this.bars = overlay.shadowRoot?.querySelector<HTMLElement>("[data-skullet-bars]") ?? null
    }
  }

  private createOverlay(): void {
    const overlay =
      this.overlay?.isConnected === true
        ? this.overlay
        : (this.root.querySelector<HTMLElement>("[data-skullet-overlay]") ??
          document.createElement("div"))

    overlay.setAttribute("data-skullet-overlay", "")
    overlay.setAttribute("aria-hidden", "true")
    if (!overlay.isConnected) this.root.append(overlay)

    const { bars } = attachShadow(overlay)
    // The pre-paint script may have drawn and started its own hold: take it over cleanly.
    settle(bars)

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

    // A font that lands late changes the metrics the bars are trimmed with, but not the
    // font string they are cached under — so the cache has to go, not just the geometry.
    const afterFonts = () => {
      resetFontCache()
      this.schedule()
    }

    document.fonts?.addEventListener?.("loadingdone", afterFonts)
    document.fonts?.ready.then(afterFonts)

    for (const image of content.querySelectorAll("img")) {
      if (!image.complete) image.addEventListener("load", () => this.schedule(), { once: true })
      image
        .decode?.()
        .then(() => this.schedule())
        .catch(() => {})
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
    this.resolve()
    if (stateOf(this.root) !== "loading") return

    if (!this.overlay?.isConnected || !this.bars?.isConnected) {
      this.createOverlay()
      this.setPhase(this.phase)
    }

    const { content, overlay, bars } = this
    if (!content || !overlay || !bars) return

    const { lines, blocks } = measure(content, overlay)
    const rects: Rect[] = [...blocks]

    for (const line of lines) {
      const box = barBox(line)
      rects.push({ x: line.x, y: box.y, width: line.width, height: box.height })
    }

    if (debugOn(this.root)) this.root.style.outline = DEBUG_LOADING

    const motion = motionOf(this.root)
    const host = this.root.getBoundingClientRect()
    const container = { width: host.width, height: host.height }
    const fragment = document.createDocumentFragment()

    for (const rect of rects) {
      const bar = createBar(rect)
      drawShimmer(bar, rect, container, motion)
      fragment.append(bar)
    }

    bars.replaceChildren(fragment)
  }
}
