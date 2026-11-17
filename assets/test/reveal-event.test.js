import { test, after } from "node:test"
import assert from "node:assert/strict"
import { withPage, open, closeBrowser } from "./harness.js"

after(closeBrowser)

test("the page hears when content replaces its skeleton", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")

    const fired = await page.evaluate(async () => {
      const seen = []
      document.addEventListener("skullet:reveal", (event) =>
        seen.push({ id: event.detail.id, bubbles: event.bubbles, target: event.target.id })
      )

      window.harness.mount("root")
      await new Promise((resolve) => setTimeout(resolve, 400))
      window.harness.swap("root", "<p>content</p>", "loaded")
      await new Promise((resolve) => setTimeout(resolve, 600))

      return seen
    })

    assert.equal(fired.length, 1, "one event per reveal")
    assert.deepEqual(fired[0], { id: "root", bubbles: true, target: "root" })
  })
})

test("a box can be made without a server", async () => {
  await withPage(async (page) => {
    await open(page, "reveal")

    const box = await page.evaluate(async () => {
      const { createSkeletonBox } = await import("/skullet.js")
      const element = createSkeletonBox({ width: 240, height: 120, radius: "8px" })
      document.body.append(element)

      const style = getComputedStyle(element)
      return {
        tag: element.tagName,
        class: element.className,
        block: element.hasAttribute("skullet-block"),
        width: style.width,
        height: style.height,
        radius: style.borderRadius
      }
    })

    assert.deepEqual(box, {
      tag: "SPAN",
      class: "skullet-box",
      block: true,
      width: "240px",
      height: "120px",
      radius: "8px"
    })
  })
})
