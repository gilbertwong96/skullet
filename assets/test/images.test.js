import { test, after } from "node:test"
import assert from "node:assert/strict"
import { withPage, open, closeBrowser } from "./harness.js"

after(closeBrowser)

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
)

const opacity = (page) =>
  page.evaluate(() => {
    const image = document.getElementById("pic")
    return {
      opacity: Number(getComputedStyle(image).opacity).toFixed(2),
      inline: image.style.opacity
    }
  })

test("an image that decodes after the reveal fades in instead of popping", async () => {
  await withPage(async (page) => {
    // /slow.png is only requested when the content is swapped in, so goto does not wait
    // for it; it then arrives a second and a half late.
    await page.route("**/slow.png", async (route) => {
      await new Promise((done) => setTimeout(done, 1500))
      await route.fulfill({ body: PNG, contentType: "image/png" })
    })

    await open(page, "images")
    await page.evaluate(() => window.harness.mount("root"))
    await page.waitForTimeout(300)

    await page.evaluate(() =>
      window.harness.swap(
        "root",
        '<img id="pic" src="/slow.png" width="80" height="80" alt=""><p>caption</p>',
        "loaded"
      )
    )

    assert.deepEqual(await opacity(page), { opacity: "0.00", inline: "0" })

    await page.waitForTimeout(2200)

    const faded = await opacity(page)
    assert.equal(faded.opacity, "1.00")
    assert.equal(faded.inline, "", "the inline opacity should be cleaned up once it is visible")
  })
})
