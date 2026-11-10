import { test, after } from "node:test"
import assert from "node:assert/strict"
import { withPage, open, closeBrowser } from "./harness.js"

after(closeBrowser)

test("the script build leaves the same engine on window", async () => {
  await withPage(async (page) => {
    await open(page, "script")

    const api = await page.evaluate(() => Object.keys(window.Skullet ?? {}).sort())
    assert.deepEqual(api, ["SkulletHook", "attach", "registerReveal", "setDebug"])

    const bars = await page.evaluate(async () => {
      window.Skullet.attach(document.getElementById("root"))
      await new Promise((resolve) => setTimeout(resolve, 400))
      const overlay = document.querySelector("#root [data-skullet-overlay]")
      return overlay?.shadowRoot?.querySelectorAll("[data-skullet-bar]").length ?? 0
    })
    assert.ok(bars > 0, "the script build draws bars")
  })
})
