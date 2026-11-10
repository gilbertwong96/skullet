import { test, after } from "node:test"
import assert from "node:assert/strict"
import { withPage, open, closeBrowser } from "./harness.js"

after(closeBrowser)

const mount = (page, id = "root") => page.evaluate((id) => window.harness.mount(id), id)
const swap = (page, id, html, state) =>
  page.evaluate(([id, html, state]) => window.harness.swap(id, html, state), [id, html, state])

const rootInfo = (page, id = "root") =>
  page.evaluate((id) => {
    const root = document.getElementById(id)
    const overlay = root.querySelector("[data-skullet-overlay]")
    const bars = overlay?.shadowRoot?.querySelector("[data-skullet-bars]")
    return {
      phase: bars?.getAttribute("data-skullet-phase") ?? null,
      hasOverlay: Boolean(overlay),
      inlineHeight: root.style.height,
      animations: root.getAnimations().map((animation) => animation.effect.getTiming().duration),
      height: root.getBoundingClientRect().height,
      contentHeight: root.querySelector("[data-skullet-content]").getBoundingClientRect().height,
      bars: bars?.querySelectorAll("[data-skullet-bar]").length ?? 0,
      overlayOpacity: bars ? getComputedStyle(bars).opacity : null,
      hostOpacity: overlay ? getComputedStyle(overlay).opacity : null
    }
  }, id)

const paneInfo = (page, id = "root") =>
  page.evaluate((id) => {
    const pane = document.querySelector(`#${id} > [data-skullet-content]`)
    const style = getComputedStyle(pane)
    return {
      animations: pane.getAnimations().map((animation) => animation.effect.getTiming().duration),
      opacity: style.opacity,
      visibility: style.visibility,
      animationName: style.animationName,
      text: pane.textContent.trim()
    }
  }, id)

test("data inside the hold never shows a skeleton", async () => {
  await withPage(async (page) => {
    await page.clock.install()
    await open(page, "reveal")
    await mount(page)
    await page.clock.runFor(100)
    await swap(page, "root", "<p>real</p>", "loaded")

    const root = await rootInfo(page)
    const pane = await paneInfo(page)

    assert.equal(root.bars, 0)
    assert.deepEqual(pane.animations, [])
    assert.equal(pane.visibility, "visible")
    assert.equal(pane.text, "real")
  })
})

test("bars wait out the hold", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")
    await mount(page)

    const holding = await rootInfo(page)
    assert.equal(holding.phase, "holding")
    assert.equal(holding.overlayOpacity, "0")

    await page.waitForTimeout(500) // the hold, then the fade in

    const shown = await rootInfo(page)
    assert.equal(shown.phase, "bars")
    assert.equal(shown.overlayOpacity, "1")
  })
})

test("a shown skeleton crossfades", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")
    await mount(page)
    await page.waitForTimeout(300)
    assert.equal((await rootInfo(page)).phase, "bars")

    await swap(page, "root", "<p>real</p>", "loaded")
    assert.deepEqual((await paneInfo(page)).animations, [200])

    await page.waitForTimeout(400)
    assert.equal((await rootInfo(page)).bars, 0)
    assert.equal((await paneInfo(page)).opacity, "1")
  })
})

test("a taller reveal eases, then settles", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")
    await mount(page)
    await page.waitForTimeout(250)

    await swap(page, "root", "<p>a</p><p>b</p><p>c</p><p>d</p><p>e</p>", "loaded")

    const easing = await rootInfo(page)
    assert.match(easing.inlineHeight, /px$/)
    assert.deepEqual(easing.animations, [280])

    await page.waitForTimeout(600)

    const settled = await rootInfo(page)
    assert.equal(settled.inlineHeight, "")
    assert.ok(
      Math.abs(settled.height - settled.contentHeight) < 1,
      `root ${settled.height} vs content ${settled.contentHeight}`
    )
  })
})

test("a shorter reveal eases down", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")
    await mount(page, "tall")
    await page.waitForTimeout(250)

    await swap(page, "tall", "<p>only</p>", "loaded")
    assert.deepEqual((await rootInfo(page, "tall")).animations, [280])

    await page.waitForTimeout(600)

    const settled = await rootInfo(page, "tall")
    assert.equal(settled.inlineHeight, "")
    assert.ok(
      Math.abs(settled.height - settled.contentHeight) < 1,
      `root ${settled.height} vs content ${settled.contentHeight}`
    )
  })
})

test("nothing to measure still reveals", async () => {
  await withPage(async (page) => {
    const errors = []
    page.on("pageerror", (error) => errors.push(error.message))

    await open(page, "reveal")
    await mount(page, "flat")
    await page.waitForTimeout(250)

    await swap(page, "flat", "<p>content</p>", "loaded")
    await page.waitForTimeout(400)

    assert.equal((await rootInfo(page, "flat")).bars, 0)
    assert.equal((await paneInfo(page, "flat")).visibility, "visible")
    assert.deepEqual(errors, [])
  })
})

test("instant skips the hold and the fade", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")
    await mount(page, "instant")

    const shown = await rootInfo(page, "instant")
    assert.equal(shown.phase, "bars")
    assert.equal(shown.overlayOpacity, "1")

    await page.waitForTimeout(50)
    await swap(page, "instant", "<p>real</p>", "loaded")

    const revealed = await rootInfo(page, "instant")
    assert.equal(revealed.bars, 0)
    assert.equal(revealed.phase, null)
    assert.deepEqual((await paneInfo(page, "instant")).animations, [])
  })
})

test("reduced motion reveals instantly", async () => {
  await withPage(
    async (page) => {
      await open(page, "reveal")
      await mount(page)
      await page.waitForTimeout(50)

      await swap(page, "root", "<p>real</p>", "loaded")

      const root = await rootInfo(page)
      const pane = await paneInfo(page)

      assert.deepEqual(pane.animations, [])
      assert.deepEqual(root.animations, [])
      assert.equal(pane.visibility, "visible")
    },
    { reducedMotion: "reduce" }
  )
})

test("destroy leaves nothing behind", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")
    await mount(page)
    await page.waitForTimeout(250)

    await page.evaluate(() => window.harness.destroy("root"))

    const destroyed = await rootInfo(page)
    // The overlay element is the server's markup; the engine empties it, never removes it.
    assert.equal(destroyed.hasOverlay, true)
    assert.equal(destroyed.bars, 0)
    assert.equal(destroyed.phase, null)
    assert.equal(destroyed.inlineHeight, "")

    await swap(page, "root", "<p>real</p>", "loaded")
    assert.equal((await rootInfo(page)).bars, 0)
  })
})

test("a later patch leaves a running reveal alone", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")
    await mount(page)
    await page.waitForTimeout(250)

    await swap(page, "root", "<p>a</p><p>b</p><p>c</p><p>d</p><p>e</p>", "loaded")
    assert.deepEqual((await rootInfo(page)).animations, [280])

    // LiveView patches the same skeleton again while the ease is still running.
    await swap(page, "root", "<p>a</p><p>b</p><p>c</p><p>d</p><p>e</p>", "loaded")

    assert.deepEqual(
      (await rootInfo(page)).animations,
      [280],
      "a second patch cancelled the height ease"
    )
  })
})

test("a patch that strips unknown attributes leaves the skeleton intact", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")
    await mount(page)
    await page.waitForTimeout(250)

    // What LiveView does on every patch: every attribute its own render did not produce
    // is removed, inline styles included.
    await page.evaluate(() => {
      const root = document.getElementById("root")
      const keep = new Set([
        "class",
        "id",
        "phx-hook",
        "data-skullet-state",
        "data-skullet-reveal",
        "aria-busy",
        "data-skullet-content",
        "data-skullet-overlay",
        "aria-hidden"
      ])
      for (const element of [
        root,
        root.querySelector("[data-skullet-content]"),
        root.querySelector("[data-skullet-overlay]")
      ]) {
        for (const { name } of element.attributes) {
          if (!keep.has(name)) element.removeAttribute(name)
        }
      }
    })

    const after = await rootInfo(page)
    assert.equal(after.phase, "bars")
    assert.ok(after.bars > 0, "the bars did not survive")
  })
})

test("an overlay lost to a patch is rebuilt, not drawn into", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")
    await mount(page)
    await page.waitForTimeout(250)
    assert.ok((await rootInfo(page)).bars > 0)

    // LiveView replaced or pruned the overlay: the engine must not keep drawing into it.
    await page.evaluate(() => document.querySelector("#root > [data-skullet-overlay]").remove())
    await swap(page, "root", "<p>sample</p>", "loading")
    await page.waitForTimeout(350)

    const after = await rootInfo(page)
    assert.equal(after.hasOverlay, true, "the overlay was not rebuilt")
    assert.ok(after.bars > 0, "the engine drew into a detached overlay")
    assert.equal(after.phase, "bars")
  })
})

test("the timings are custom properties", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")
    await page.evaluate(() => {
      const root = document.getElementById("root")
      root.style.setProperty("--skullet-hold", "0ms")
      root.style.setProperty("--skullet-fade", "0ms")
      root.style.setProperty("--skullet-resize", "40ms")
    })
    await mount(page)

    // A zero hold shows the bars at once instead of after 150ms.
    await page.waitForTimeout(40)
    const held = await rootInfo(page)
    assert.equal(held.phase, "bars")
    assert.ok(held.bars > 0)

    await page.waitForTimeout(150)
    await swap(page, "root", "<p>a</p><p>b</p><p>c</p>", "loaded")

    assert.deepEqual((await rootInfo(page)).animations, [40])

    await page.waitForTimeout(200)
    assert.equal((await rootInfo(page)).bars, 0)
    assert.equal((await paneInfo(page)).animations.length, 0)
  })
})

test("a sweep reveal wipes the skeleton away over the content", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")
    await page.evaluate(() => {
      document.getElementById("root").setAttribute("data-skullet-reveal", "sweep")
    })
    await mount(page)
    await page.waitForTimeout(300)

    await swap(page, "root", "<p>a</p><p>b</p><p>c</p>", "loaded")

    const during = await page.evaluate(() => {
      const root = document.getElementById("root")
      const overlay = root.querySelector("[data-skullet-overlay]")
      const pane = root.querySelector("[data-skullet-content]")
      return {
        wiping: overlay.getAnimations().length > 0,
        paneAnimations: pane.getAnimations().length,
        paneOpacity: getComputedStyle(pane).opacity
      }
    })

    assert.equal(during.wiping, true, "the overlay is not being wiped")
    assert.equal(during.paneAnimations, 0, "sweep should not fade the content")
    assert.equal(during.paneOpacity, "1")

    await page.waitForTimeout(500)

    const after = await rootInfo(page)
    assert.equal(after.bars, 0)
    assert.equal(after.phase, null)
    assert.equal(
      await page.evaluate(
        () => document.querySelector("#root > [data-skullet-overlay]").style.clipPath
      ),
      ""
    )
  })
})

test("a pane LiveView reused for something else is found again", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")
    await mount(page)
    await page.waitForTimeout(250)
    assert.ok((await rootInfo(page)).bars > 0)

    // What LiveView did in a real app: the node the engine held as the pane became the
    // overlay, and a fresh pane was inserted next to it.
    await page.evaluate(() => {
      const root = document.getElementById("root")
      const pane = root.querySelector("[data-skullet-content]")
      const overlay = root.querySelector("[data-skullet-overlay]")

      pane.removeAttribute("data-skullet-content")
      pane.setAttribute("data-skullet-overlay", "")

      const fresh = document.createElement("div")
      fresh.className = "skullet-content"
      fresh.setAttribute("data-skullet-content", "")
      fresh.innerHTML = "<p>sample</p><p>second line</p>"
      overlay.replaceWith(fresh)
    })

    await swap(page, "root", "<p>sample</p><p>second line</p>", "loading")
    await page.waitForTimeout(400)

    const after = await rootInfo(page)
    assert.equal(after.hasOverlay, true)
    assert.equal(after.phase, "bars")
    assert.ok(after.bars > 0, "the engine drew into the node it used to call the pane")
  })
})

test("smart crossfades quickly on a refetch", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")
    await mount(page)
    await page.waitForTimeout(300)

    await swap(page, "root", "<p>real</p>", "loaded")
    await page.waitForTimeout(500)

    // a second loading cycle whose skeleton is up past the hold: the shape is known by then
    await swap(page, "root", "<p>sample</p>", "loading")
    await page.waitForTimeout(400)
    await swap(page, "root", "<p>real</p>", "loaded")

    assert.deepEqual((await paneInfo(page)).animations, [120])
  })
})

test("smart reveals at once while someone is scrolling or typing", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")
    await mount(page)
    await page.waitForTimeout(300)

    await page.keyboard.press("ArrowDown")
    await swap(page, "root", "<p>real</p>", "loaded")

    assert.deepEqual((await paneInfo(page)).animations, [])
    assert.equal((await paneInfo(page)).visibility, "visible")
  })
})

test("a large reveal cascades its pieces instead of fading as one", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")
    await mount(page)
    await page.waitForTimeout(300)

    await swap(page, "root", "<p>a</p><p>b</p><p>c</p><p>d</p><p>e</p>", "loaded")

    const animated = await page.evaluate(() => {
      const pane = document.querySelector("#root > [data-skullet-content]")
      const paragraphs = [...pane.querySelectorAll("p")]
      return {
        pane: pane.getAnimations().length,
        pieces: paragraphs.map((paragraph) => paragraph.getAnimations().length)
      }
    })

    assert.equal(animated.pane, 0, "the pane itself should not fade on a cascade")
    assert.ok(
      animated.pieces.every((count) => count === 1),
      `pieces did not all animate: ${animated.pieces}`
    )
  })
})

test("smart cascades rows and lets small text follow its heading", async () => {
  await withPage(async (page) => {
    await open(page, "reveal-rows")
    await mount(page)
    await page.waitForTimeout(300)

    // the sample is replaced by the same rows, so the reveal cascades them
    await page.evaluate(() => window.harness.swap("root", null, "loaded"))

    const rows = await page.evaluate(() => {
      const pane = document.querySelector("#root > [data-skullet-content]")
      const delay = (element) => {
        const [animation] = element.getAnimations()
        return animation ? Number(animation.effect.getComputedTiming().delay) : null
      }

      return [...pane.querySelectorAll(".row")].map((row) => ({
        heading: delay(row.querySelector("h3")),
        small: delay(row.querySelector("small"))
      }))
    })

    assert.ok(
      rows.every((row) => row.heading !== null),
      "headings did not animate"
    )
    assert.ok(
      rows.every((row) => row.small - row.heading === 90),
      `small text should trail its heading by --skullet-secondary-delay: ${JSON.stringify(rows)}`
    )
  })
})

test("the enter knobs give every piece a starting filter and scale", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")
    await page.evaluate(() => {
      const root = document.getElementById("root")
      root.style.setProperty("--skullet-enter-filter", "blur(6px)")
      root.style.setProperty("--skullet-enter-scale", "0.98")
      root.style.setProperty("--skullet-delay", "50ms")
      root.setAttribute("data-skullet-reveal", "sequence")
    })
    await mount(page)
    await page.waitForTimeout(300)

    await swap(page, "root", "<p>a</p><p>b</p>", "loaded")

    const first = await page.evaluate(() => {
      const pane = document.querySelector("#root > [data-skullet-content]")
      const [paragraph] = pane.querySelectorAll("p")
      const [animation] = paragraph.getAnimations()
      const [keyframe] = animation.effect.getKeyframes()
      const timing = animation.effect.getComputedTiming()

      return {
        filter: keyframe.filter,
        transform: keyframe.transform,
        delay: Number(timing.delay)
      }
    })

    assert.equal(first.filter, "blur(6px)")
    assert.match(first.transform, /scale\(0\.98\)/)
    assert.ok(first.delay >= 50, `the reveal delay was not applied: ${first.delay}`)
  })
})

test("a sequence reveal times each piece by its place in the page", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")
    await page.evaluate(() => {
      document.getElementById("root").setAttribute("data-skullet-reveal", "sequence")
    })
    await mount(page)
    await page.waitForTimeout(300)

    await swap(page, "root", "<p>a</p><p>b</p><p>c</p><p>d</p>", "loaded")

    const during = await page.evaluate(() => {
      const root = document.getElementById("root")
      const overlay = root.querySelector("[data-skullet-overlay]")
      const pane = root.querySelector("[data-skullet-content]")

      // A bar also carries its shimmer animation, whose delay is the shared negative phase;
      // the reveal's own animation is the script one.
      const delayOf = (element) =>
        element
          .getAnimations()
          .filter((animation) => !("animationName" in animation))
          .map((animation) => Number(animation.effect.getComputedTiming().delay))

      return {
        pieces: [...pane.querySelectorAll("p")].map((element) => ({
          top: element.getBoundingClientRect().top,
          delays: delayOf(element)
        })),
        bars: [...overlay.shadowRoot.querySelectorAll("[data-skullet-bar]")].map(delayOf)
      }
    })

    const pieces = [...during.pieces].sort((a, b) => a.top - b.top)
    assert.ok(pieces.length > 1)
    assert.ok(
      pieces.every((piece) => piece.delays.length === 1),
      "every piece should animate once"
    )

    const delays = pieces.map((piece) => piece.delays[0])

    for (let index = 1; index < delays.length; index++) {
      assert.ok(
        delays[index] > delays[index - 1],
        `piece ${index} is timed before the one above it: ${delays[index - 1]} → ${delays[index]}`
      )
    }

    assert.ok(
      during.bars.every((delays) => delays.length === 1),
      "the bars should animate once each"
    )

    await page.waitForTimeout(1200)
    assert.equal((await rootInfo(page)).bars, 0)
    assert.equal((await rootInfo(page)).phase, null)
  })
})

test("the debug overlay reports whether the reveal moved the page", async () => {
  await withPage(async (page) => {
    await page.goto("http://skullet.test/fixtures/reveal.html?skullet-debug")
    await mount(page)
    await page.waitForTimeout(250)

    const outline = () =>
      page.evaluate(() => ({
        outline: document.getElementById("root").style.outline,
        title: document.getElementById("root").title
      }))

    assert.match((await outline()).outline, /59, 130, 246/, "blue while loading")

    // same height on both sides: nothing moved
    await swap(page, "root", "<p>real</p>", "loaded")
    await page.waitForTimeout(500)
    const still = await outline()
    assert.match(still.outline, /34, 197, 94/)
    assert.match(still.title, /no movement/)

    // a taller reveal reports the distance
    await swap(page, "root", "<p>one</p><p>two</p><p>three</p>", "loading")
    await page.waitForTimeout(400)
    await swap(page, "root", "<p>a</p><p>b</p>", "loaded")
    await page.waitForTimeout(500)
    const moved = await outline()
    assert.match(moved.outline, /239, 68, 68/)
    assert.match(moved.title, /moved/)
  })
})

test("a second loading cycle shows the skeleton again", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")
    await mount(page)
    await page.waitForTimeout(250)

    await swap(page, "root", "<p>real</p>", "loaded")
    await page.waitForTimeout(400)
    assert.equal((await rootInfo(page)).bars, 0)

    await swap(page, "root", "<p>sample</p>", "loading")

    const holding = await rootInfo(page)
    assert.equal(holding.phase, "holding")
    assert.equal((await paneInfo(page)).visibility, "hidden")

    await page.waitForTimeout(500) // the hold, then the fade in
    const shown = await rootInfo(page)
    assert.equal(shown.phase, "bars")
    assert.ok(shown.bars > 0)
    // The previous reveal faded the bars out; a new skeleton must paint again.
    assert.equal(shown.overlayOpacity, "1")

    await swap(page, "root", "<p>real two</p>", "loaded")
    await page.waitForTimeout(400)

    assert.equal((await paneInfo(page)).text, "real two")
    assert.equal((await rootInfo(page)).bars, 0)
  })
})

test("the no-JS fallback is cancelled once bars are up", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")
    await mount(page)

    assert.equal((await paneInfo(page)).animationName, "none")
  })
})
