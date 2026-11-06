import { test, after } from "node:test"
import assert from "node:assert/strict"
import { withPage, open, closeBrowser } from "./harness.js"

after(closeBrowser)

const visibility = (page, id) =>
  page.$eval(`#${id} > [data-skullet-content]`, el => getComputedStyle(el).visibility)

test("the content pane is hidden while loading", async () => {
  await withPage(async page => {
    await open(page, "css")
    assert.equal(await visibility(page, "loading"), "hidden")
  })
})

test("the content pane is visible once loaded", async () => {
  await withPage(async page => {
    await open(page, "css")
    assert.equal(await visibility(page, "loaded"), "visible")
  })
})

test("the status span is visually hidden but present", async () => {
  await withPage(async page => {
    await open(page, "css")
    const box = await page.$eval("#loading > .skullet-status", el => {
      const rect = el.getBoundingClientRect()
      return { width: rect.width, height: rect.height, text: el.textContent.trim() }
    })

    assert.ok(box.width <= 1 && box.height <= 1, `status box is ${box.width}x${box.height}`)
    assert.equal(box.text, "Loading profile")
  })
})

test("theme defaults are on :root", async () => {
  await withPage(async page => {
    await open(page, "css")
    const vars = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement)
      return [
        "--skullet-base",
        "--skullet-highlight",
        "--skullet-radius",
        "--skullet-animation",
        "--skullet-speed"
      ].map(name => [name, style.getPropertyValue(name).trim()])
    })

    for (const [name, value] of vars) assert.ok(value, `${name} is empty`)
  })
})

/* Custom properties keep `light-dark()` unresolved until they are used, so the colours
   are read off a probe that actually paints with them. */
const readTheme = page =>
  page.evaluate(() => {
    let probe = document.getElementById("theme-probe")

    if (!probe) {
      probe = document.createElement("div")
      probe.id = "theme-probe"
      probe.style.background = "var(--skullet-base)"
      probe.style.borderTop = "1px solid var(--skullet-highlight)"
      document.body.append(probe)
    }

    const style = getComputedStyle(probe)
    return [style.backgroundColor, style.borderTopColor]
  })

test("a dark page gets different bars than a light one", async () => {
  await withPage(async page => {
    await open(page, "css")
    const light = await readTheme(page)

    await page.evaluate(() => {
      document.documentElement.style.colorScheme = "dark"
    })
    const dark = await readTheme(page)


    assert.notEqual(dark[0], light[0])
    assert.notEqual(dark[1], light[1])
  })
})

test("a light page keeps light bars on a dark desktop", async () => {
  // The bug this pins: bars used to follow prefers-color-scheme, so a light page on a
  // dark desktop painted near-white bars into a near-white card and they vanished.
  await withPage(
    async page => {
      await open(page, "css")
      const [base] = await readTheme(page)

      assert.match(base, /^rgba?\(128, 128, 128/)
    },
    { colorScheme: "dark" }
  )
})

test("with JS disabled the sample appears within 6s", async () => {
  await withPage(
    async page => {
      await open(page, "css")
      await page.waitForTimeout(1000)
      assert.equal(await visibility(page, "loading"), "hidden")
      await page.waitForTimeout(5000)
      assert.equal(await visibility(page, "loading"), "visible")
    },
    { javaScriptEnabled: false }
  )
})
