import { test, after } from "node:test"
import assert from "node:assert/strict"
import { withPage, open, closeBrowser } from "./harness.js"

after(closeBrowser)

const swap = (page, html, state) =>
  page.evaluate(([html, state]) => window.harness.swap("root", html, state), [html, state])

const pieceDelays = (page) =>
  page.evaluate(() => {
    const pane = document.querySelector("#root > [data-skullet-content]")

    return [...pane.querySelectorAll("p")].map((paragraph) => {
      const [animation] = paragraph.getAnimations()
      return animation ? Number(animation.effect.getComputedTiming().delay) : null
    })
  })

test("attach takes a spec of its own", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")
    await page.evaluate(() =>
      window.harness.mount("root", { reveal: { order: () => 42, duration: 100 } })
    )
    await page.waitForTimeout(300)

    await swap(page, "<p>a</p><p>b</p>", "loaded")

    assert.deepEqual(await pieceDelays(page), [42, 42])
  })
})

test("a registered spec can be asked for by name", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")
    await page.evaluate(() => {
      window.registerReveal("mine", { duration: 40 })
      document.getElementById("root").setAttribute("data-skullet-reveal", "mine")
    })
    await page.evaluate(() => window.harness.mount("root"))
    await page.waitForTimeout(300)

    await swap(page, "<p>a</p>", "loaded")

    const durations = await page.evaluate(() => {
      const pane = document.querySelector("#root > [data-skullet-content]")
      return pane.getAnimations().map((animation) => animation.effect.getTiming().duration)
    })

    assert.deepEqual(durations, [40])
  })
})

test("a spec's hold replaces the theme's", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")
    await page.evaluate(() => window.harness.mount("root", { reveal: { hold: 0 } }))

    // no waiting: the bars are up on the first frame after mount
    const phase = await page.evaluate(() => {
      const overlay = document.querySelector("#root > [data-skullet-overlay]")
      return overlay.shadowRoot
        .querySelector("[data-skullet-bars]")
        .getAttribute("data-skullet-phase")
    })

    assert.equal(phase, "bars")
  })
})

test("a wipe of your own draws the pane's mask each frame", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")
    await page.evaluate(() =>
      window.harness.mount("root", {
        reveal: {
          duration: 200,
          wipe: {
            mask: (progress) => `linear-gradient(#000 ${(progress * 100).toFixed(1)}%, transparent)`
          }
        }
      })
    )
    await page.waitForTimeout(300)

    await swap(page, "<p>a</p>", "loaded")
    await page.waitForTimeout(80) // the mask is drawn on the next frame

    const during = await page.evaluate(() => {
      const root = document.getElementById("root")
      const pane = root.querySelector("[data-skullet-content]")
      const bars = root
        .querySelector("[data-skullet-overlay]")
        .shadowRoot.querySelector("[data-skullet-bars]")

      return {
        mask: pane.style.maskImage || pane.style.webkitMaskImage,
        barsOpacity: Number(getComputedStyle(bars).opacity)
      }
    })

    assert.match(during.mask, /linear-gradient/)
    assert.ok(during.barsOpacity < 1, "without an `out`, the skeleton crossfades out")

    await page.waitForTimeout(500)

    const after = await page.evaluate(() => {
      const root = document.getElementById("root")
      const pane = root.querySelector("[data-skullet-content]")
      const overlay = root.querySelector("[data-skullet-overlay]")
      return {
        mask: pane.style.maskImage || pane.style.webkitMaskImage,
        bars: overlay.shadowRoot.querySelectorAll("[data-skullet-bar]").length,
        phase: overlay.shadowRoot
          .querySelector("[data-skullet-bars]")
          .getAttribute("data-skullet-phase")
      }
    })

    assert.equal(after.mask, "")
    assert.equal(after.bars, 0)
    assert.equal(after.phase, null)
  })
})
