import { test, after } from "node:test"
import assert from "node:assert/strict"
import { withPage, open, closeBrowser } from "./harness.js"

after(closeBrowser)

test("a served pre-paint script starts itself", async () => {
  await withPage(async (page) => {
    await open(page, "pre-src")
    await page.waitForTimeout(200)

    const painted = await page.evaluate(() => {
      const overlay = document.querySelector("#root [data-skullet-overlay]")
      const bars = overlay?.shadowRoot?.querySelector("[data-skullet-bars]")
      return {
        engine: document.documentElement.classList.contains("skullet-js"),
        bars: bars?.querySelectorAll("[data-skullet-bar]").length ?? 0
      }
    })

    assert.equal(painted.engine, true, "the no-JS fallback is switched off")
    assert.ok(painted.bars > 0, "and the bars are in the first paint")
  })
})
