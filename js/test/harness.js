import { chromium } from "playwright"
import { readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, "..", "..")
const fixtures = join(root, "js", "fixtures")
const assets = join(root, "priv", "static")

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".gif": "image/gif"
}

let browser

export async function withPage(callback, opts = {}) {
  browser ??= await chromium.launch()
  const context = await browser.newContext(opts)
  const page = await context.newPage()

  await page.route("http://skullet.test/**", async (route) => {
    const { pathname } = new URL(route.request().url())
    const base = pathname.startsWith("/fixtures/") ? fixtures : assets
    const path = join(base, pathname.replace(/^\/fixtures\/|^\//, ""))
    const type = TYPES[path.slice(path.lastIndexOf("."))]

    try {
      const body = await readFile(path)
      await route.fulfill({ body, contentType: type ?? "application/octet-stream" })
    } catch {
      await route.fulfill({ status: 404, body: "not found" })
    }
  })

  try {
    await callback(page)
  } finally {
    await context.close()
  }
}

export async function open(page, name) {
  await page.goto(`http://skullet.test/fixtures/${name}.html`)
}

export async function closeBrowser() {
  if (!browser) return
  await browser.close()
  browser = undefined
}
