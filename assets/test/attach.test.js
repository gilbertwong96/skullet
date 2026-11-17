import { test, after } from "node:test"
import assert from "node:assert/strict"
import { withPage, open, closeBrowser } from "./harness.js"

after(closeBrowser)

const attach = (page, options) =>
  page.evaluate(async (options) => {
    const { attach } = await import("/skullet.js")
    const root = document.getElementById("root")
    const first = attach(root, options ?? {})
    const second = attach(root, options ?? {})
    await new Promise((resolve) => setTimeout(resolve, 350))

    return {
      same: first === second,
      overlays: root.querySelectorAll("[data-skullet-overlay]").length,
      bars:
        root
          .querySelector("[data-skullet-overlay]")
          ?.shadowRoot?.querySelectorAll("[data-skullet-bar]").length ?? 0
    }
  }, options)

test("attaching the same root twice keeps one engine", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")

    const info = await attach(page)

    assert.equal(info.same, true, "the second attach returns the first engine")
    assert.equal(info.overlays, 1, "one overlay")
    assert.ok(info.bars > 0, "and it still draws")
  })
})

test("a destroyed root can be attached again", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")

    const info = await page.evaluate(async () => {
      const { attach } = await import("/skullet.js")
      const root = document.getElementById("root")
      const first = attach(root)
      first.destroy()
      const second = attach(root)

      return { fresh: first !== second, active: second.active }
    })

    assert.deepEqual(info, { fresh: true, active: true })
  })
})
