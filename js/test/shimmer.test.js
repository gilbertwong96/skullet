import { test, after } from "node:test"
import assert from "node:assert/strict"
import { withPage, open, closeBrowser } from "./harness.js"

after(closeBrowser)

const mounted = (page, id) =>
  page.waitForFunction(
    id => {
      const overlay = document.querySelector(`#${id} > [data-skullet-overlay]`)
      return Boolean(overlay?.shadowRoot?.querySelector("[data-skullet-bar]"))
    },
    id
  )

const mount = async (page, id) => {
  await page.evaluate(id => window.mount(id), id)
  await mounted(page, id)
}

const barStyle = (page, id) =>
  page.evaluate(id => {
    const overlay = document.querySelector(`#${id} > [data-skullet-overlay]`)
    const bar = overlay?.shadowRoot?.querySelector("[data-skullet-bar]")
    if (!bar) return null
    const style = getComputedStyle(bar)
    return {
      animationName: style.animationName,
      animationDuration: style.animationDuration,
      animationDelay: style.animationDelay,
      backgroundImage: style.backgroundImage,
      animations: bar.getAnimations().length
    }
  }, id)

/** Computed animation times come back in seconds or milliseconds, whichever the engine picked. */
const ms = value => {
  const amount = Number.parseFloat(value)
  return /ms$/.test(value.trim()) ? amount : amount * 1000
}

test("bars shimmer by default", async () => {
  await withPage(async page => {
    await open(page, "shimmer")
    await mount(page, "a")
    const style = await barStyle(page, "a")

    assert.equal(style.animationName, "skullet-shimmer")
    assert.match(style.backgroundImage, /repeating-linear-gradient\(110deg/)
  })
})

test("the pace follows the width", async () => {
  await withPage(async page => {
    await open(page, "shimmer")
    await mount(page, "a")
    await mount(page, "wide")

    assert.equal(ms((await barStyle(page, "a")).animationDuration), 2000)
    assert.equal(ms((await barStyle(page, "wide")).animationDuration), 4000)
  })
})

test("fast halves it", async () => {
  await withPage(async page => {
    await open(page, "shimmer")
    await mount(page, "fast")

    assert.equal(ms((await barStyle(page, "fast")).animationDuration), 1000)
  })
})

test("two roots share one sweep", async () => {
  await withPage(async page => {
    await open(page, "shimmer")
    await mount(page, "a")
    await page.waitForTimeout(300)
    await mount(page, "b")

    // Each bar's position in its own sweep, read at one instant: the delay is the
    // negative of the clock, so a late mount joins the sweep instead of starting one.
    const positions = await page.evaluate(ids =>
      ids.map(id => {
        const overlay = document.querySelector(`#${id} > [data-skullet-overlay]`)
        const bar = overlay?.shadowRoot?.querySelector("[data-skullet-bar]")
        const animation = bar?.getAnimations()[0]
        return {
          delay: getComputedStyle(bar).animationDelay,
          currentTime: Number(animation?.currentTime ?? Number.NaN)
        }
      }), ["a", "b"])

    const [a, b] = positions.map(({ delay, currentTime }) => currentTime - ms(delay))

    assert.ok(Number.isFinite(a) && Number.isFinite(b), JSON.stringify(positions))
    assert.ok(
      Math.abs(a - b) < 50,
      `bars are ${Math.abs(a - b)}ms apart in the sweep (${JSON.stringify(positions)})`
    )
  })
})

test("pulse and none are honoured", async () => {
  await withPage(async page => {
    await open(page, "shimmer")
    await mount(page, "pulse")
    await mount(page, "none")

    const pulse = await barStyle(page, "pulse")
    assert.equal(pulse.animationName, "skullet-pulse")
    assert.equal(ms(pulse.animationDuration), 2400)

    const none = await barStyle(page, "none")
    assert.equal(none.animationName, "none")
    assert.equal(none.animations, 0)
  })
})

test("reduced motion stops every animation", async () => {
  await withPage(
    async page => {
      await open(page, "shimmer")
      await mount(page, "a")

      assert.equal((await barStyle(page, "a")).animations, 0)
    },
    { reducedMotion: "reduce" }
  )
})
