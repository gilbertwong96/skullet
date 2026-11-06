import { test, after } from "node:test"
import assert from "node:assert/strict"
import { withPage, open, closeBrowser } from "./harness.js"

after(closeBrowser)

const ORIGIN = "#root > [data-skullet-overlay]"

const bars = page =>
  page.evaluate(originSelector => {
    const overlay = document.querySelector(originSelector)
    if (!overlay) return []
    const origin = overlay.getBoundingClientRect()
    return [...overlay.shadowRoot.querySelectorAll("[data-skullet-bar]")].map(bar => {
      const rect = bar.getBoundingClientRect()
      return {
        x: rect.left - origin.left,
        y: rect.top - origin.top,
        width: rect.width,
        height: rect.height
      }
    })
  }, ORIGIN)

const box = (page, selector, originSelector = ORIGIN) =>
  page.evaluate(
    ([selector, originSelector]) => {
      const origin = document.querySelector(originSelector).getBoundingClientRect()
      const rect = document.querySelector(selector).getBoundingClientRect()
      return {
        x: rect.left - origin.left,
        y: rect.top - origin.top,
        width: rect.width,
        height: rect.height
      }
    },
    [selector, originSelector]
  )

const within = (list, area, slack = 1) =>
  list.filter(
    bar =>
      bar.y >= area.y - slack &&
      bar.y + bar.height <= area.y + area.height + slack &&
      bar.x >= area.x - slack &&
      bar.x + bar.width <= area.x + area.width + slack
  )

/** The engine draws on the next frame; nothing is asserted before it has. */
const drawn = page =>
  page.waitForFunction(() => {
    const overlay = document.querySelector("#root > [data-skullet-overlay]")
    return Boolean(overlay?.shadowRoot?.querySelector("[data-skullet-bar]"))
  })

const near = (a, b, slack = 0.6) =>
  Math.abs(a.x - b.x) < slack &&
  Math.abs(a.y - b.y) < slack &&
  Math.abs(a.width - b.width) < slack &&
  Math.abs(a.height - b.height) < slack

const overlaps = (a, b) =>
  Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 0 &&
  Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 0

test("one bar per line of text", async () => {
  await withPage(async page => {
    await open(page, "measure")
    await drawn(page)
    const all = await bars(page)

    assert.equal(within(all, await box(page, "#single")).length, 1)

    const three = await box(page, "#three")
    const lines = within(all, three)
    assert.equal(lines.length, 3)
    assert.deepEqual(
      lines.map(line => line.y),
      [...lines.map(line => line.y)].sort((a, b) => a - b)
    )
  })
})

test("text lines are trimmed to the font, inside the line box", async () => {
  await withPage(async page => {
    await open(page, "measure")
    await drawn(page)
    const three = await box(page, "#three")

    for (const line of within(await bars(page), three)) {
      assert.ok(line.y >= three.y - 1, `bar starts above the line: ${line.y} < ${three.y}`)
      assert.ok(
        line.y + line.height <= three.y + three.height + 1,
        `bar ends below the line: ${line.y + line.height}`
      )
      assert.ok(line.height < 24, `bar is not trimmed: ${line.height}`)
      assert.ok(line.height > 6, `bar is degenerate: ${line.height}`)
    }
  })
})

test("inline markup stays one bar per line", async () => {
  await withPage(async page => {
    await open(page, "measure")
    await drawn(page)
    assert.equal(within(await bars(page), await box(page, "#inline")).length, 1)
  })
})

test("media is one block at its box", async () => {
  await withPage(async page => {
    await open(page, "measure")
    await drawn(page)
    const image = await box(page, "#img")
    const match = (await bars(page)).find(bar => near(bar, image))

    assert.ok(match, `no bar at the image's box ${JSON.stringify(image)}`)
    assert.ok(Math.abs(match.width - 80) < 0.6)
    assert.ok(Math.abs(match.height - 80) < 0.6)
  })
})

test("a painted box is one block at its box", async () => {
  await withPage(async page => {
    await open(page, "measure")
    await drawn(page)
    const chip = await box(page, "#chip")
    assert.ok(
      (await bars(page)).some(bar => near(bar, chip)),
      `no bar at the chip's box ${JSON.stringify(chip)}`
    )
  })
})

test("visually hidden text draws nothing", async () => {
  await withPage(async page => {
    await open(page, "measure")
    await drawn(page)
    const hidden = await box(page, "#sr")

    for (const bar of await bars(page)) {
      assert.ok(!overlaps(bar, hidden), `a bar covers the hidden label: ${JSON.stringify(bar)}`)
    }
  })
})

test("whitespace-only text draws nothing", async () => {
  await withPage(async page => {
    await open(page, "measure")
    await drawn(page)
    const empty = await box(page, "#empty")

    for (const bar of await bars(page)) {
      assert.ok(!overlaps(bar, empty), `a bar covers the empty paragraph: ${JSON.stringify(bar)}`)
    }
  })
})

test("a nested skeleton draws as one block and is not measured through", async () => {
  await withPage(async page => {
    await open(page, "measure")
    await drawn(page)
    const inner = await box(page, "#inner")
    const inside = within(await bars(page), inner)

    assert.equal(inside.length, 1, `expected one block, got ${JSON.stringify(inside)}`)
    assert.ok(near(inside[0], inner))
  })
})

test("nothing to measure still initialises", async () => {
  await withPage(async page => {
    const errors = []
    page.on("pageerror", error => errors.push(error.message))
    await open(page, "measure")
    await drawn(page)

    const count = await page.evaluate(() => {
      const overlay = document.querySelector("#empty-root > [data-skullet-overlay]")
      return overlay ? overlay.shadowRoot.querySelectorAll("[data-skullet-bar]").length : -1
    })

    assert.equal(count, 0)
    assert.deepEqual(errors, [])
  })
})

test("bars fall back without canvas metrics", async () => {
  await withPage(async page => {
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = () => null
    })
    await open(page, "measure")
    await drawn(page)

    const three = await box(page, "#three")
    const lines = within(await bars(page), three)
    assert.equal(lines.length, 3)

    lines.forEach((line, index) => {
      const centre = three.y + index * 24 + 12
      assert.ok(
        Math.abs(line.y + line.height / 2 - centre) < 1.5,
        `bar ${index} is not centred in its line: ${line.y + line.height / 2} vs ${centre}`
      )
      assert.ok(line.height <= 0.75 * 16 + 0.5, `fallback bar too tall: ${line.height}`)
    })
  })
})
