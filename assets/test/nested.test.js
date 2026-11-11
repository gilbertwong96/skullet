import { test, after } from "node:test"
import assert from "node:assert/strict"
import { withPage, open, closeBrowser } from "./harness.js"

after(closeBrowser)

const bars = (page, id) =>
  page.evaluate((id) => {
    const root = document.getElementById(id)
    const overlay = root.querySelector("[data-skullet-overlay]")
    return overlay?.shadowRoot?.querySelectorAll("[data-skullet-bar]").length ?? 0
  }, id)

test("a skeleton inside a loading one leaves the drawing to it", async () => {
  await withPage(async (page) => {
    await open(page, "nested")
    await page.waitForTimeout(400)

    const outer = await bars(page, "outer")
    const inner = await bars(page, "inner")

    assert.ok(outer > 0, "the outer skeleton draws")
    assert.equal(inner, 0, "the inner one stays out of the way")
  })
})

test("reduced motion is followed when the setting changes", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")
    await page.evaluate(() => window.harness.mount("root"))
    await page.waitForTimeout(300)

    const name = () =>
      page.evaluate(() => {
        const overlay = document.querySelector("#root [data-skullet-overlay]")
        const bar = overlay?.shadowRoot?.querySelector("[data-skullet-bar]")
        return bar ? getComputedStyle(bar).animationName : "none"
      })

    const animated = await name()
    assert.ok(animated.startsWith("skullet-"), `bars animate while motion is allowed (${animated})`)

    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.waitForTimeout(200)

    assert.equal(await name(), "none", "the animation stops when reduced motion turns on")
  })
})
