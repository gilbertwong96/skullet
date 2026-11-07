import { test, after } from "node:test"
import assert from "node:assert/strict"
import { withPage, open, closeBrowser } from "./harness.js"

after(closeBrowser)

const bars = (page, id = "root") =>
  page.evaluate(id => {
    const overlay = document.querySelector(`#${id} > [data-skullet-overlay]`)
    const container = overlay?.shadowRoot?.querySelector("[data-skullet-bars]")
    return {
      attached: Boolean(overlay?.shadowRoot),
      phase: container?.getAttribute("data-skullet-phase") ?? null,
      count: container?.querySelectorAll("[data-skullet-bar]").length ?? 0,
      opacity: container ? Number(getComputedStyle(container).opacity) : null
    }
  }, id)

test("the bars are painted before any engine runs", async () => {
  await withPage(async page => {
    await open(page, "pre")

    const painted = await bars(page)
    assert.ok(painted.attached, "no shadow root")
    assert.equal(painted.count, 2)
    assert.equal(painted.phase, "holding")

    const engines = await page.evaluate(() => Boolean(window.__engines))
    assert.equal(engines, false, "the engine should not have run yet")
  })
})

test("the hold is done in CSS, so fast data never flashes", async () => {
  await withPage(async page => {
    await open(page, "pre")

    assert.equal((await bars(page)).opacity, 0)

    await page.waitForTimeout(400)
    assert.equal((await bars(page)).opacity, 1)
  })
})

test("a zero hold paints at once", async () => {
  await withPage(async page => {
    await open(page, "pre")

    const instant = await bars(page, "instant")
    assert.equal(instant.phase, "bars")
    assert.equal(instant.opacity, 1)
  })
})

test("the engine takes the pre-painted skeleton over", async () => {
  await withPage(async page => {
    await open(page, "pre")

    await page.waitForFunction(() => Boolean(window.__skulletEngine))
    await page.evaluate(() => window.__skulletEngine.attach(document.getElementById("root")))
    await page.waitForTimeout(400)

    const taken = await bars(page)
    assert.equal(taken.count, 2, "the bars were drawn twice")
    assert.equal(taken.phase, "bars")
    assert.equal(taken.opacity, 1)

    const overlays = await page.evaluate(
      () => document.querySelectorAll("#root > [data-skullet-overlay]").length
    )
    assert.equal(overlays, 1)
  })
})
