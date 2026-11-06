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

test("dark mode changes the base and highlight", async () => {
  const read = (page) =>
    page.evaluate(() => {
      const style = getComputedStyle(document.documentElement)
      return [
        style.getPropertyValue("--skullet-base").trim(),
        style.getPropertyValue("--skullet-highlight").trim()
      ]
    })

  let light
  await withPage(async page => {
    await open(page, "css")
    light = await read(page)
  })

  await withPage(
    async page => {
      await open(page, "css")
      const dark = await read(page)
      assert.notEqual(dark[0], light[0])
      assert.notEqual(dark[1], light[1])
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
