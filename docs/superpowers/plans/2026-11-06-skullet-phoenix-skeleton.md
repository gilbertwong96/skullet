# Skullet for Phoenix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Hex library, `skullet`, whose `<Skullet.skeleton>` renders your own component from sample data while loading and draws a measured, shimmering skeleton over it until the real data arrives.

**Architecture:** HEEx renders the sample inside `[data-skullet-content]` with the server-owned `data-skullet-state` on the root. A `phx-hook` (thin adapter over a framework-agnostic engine) measures the laid-out sample — one bar per wrapped line from `Range.getClientRects()` plus canvas font metrics, one block per media/painted box — and draws the bars into a shadow root over an invisible content pane. LiveView's attribute diff flips the state, which is the engine's reveal cue.

**Tech Stack:** Elixir 1.20.5 / OTP 29, Phoenix LiveView 1.2, Phoenix.Component, `lazy_html` (test), plain ES modules (no build step, no runtime deps), Playwright/Chromium via Node 26 for engine tests.

**Spec:** `docs/superpowers/specs/2026-11-06-skullet-phoenix-skeleton-design.md`

**Deviation from the spec, for the record:** the spec says "one ES module". The engine ships as `priv/static/skullet.js` (the entry, unchanged) plus sibling modules it imports with relative specifiers. The contract — one import path for consumers, no build step — is unchanged; the split is so each file has one job. Node resolves the relative imports natively and esbuild bundles them.

## Global Constraints

- Elixir `~> 1.20`, Phoenix LiveView `~> 1.2`, Phoenix HTML `~> 4.3`, `lazy_html` test-only.
- No build step and no runtime JS dependencies. Engine files are plain ES modules with explicit `.js` import specifiers.
- `id` is required on `<Skullet.skeleton>`. `sample` is required. `reveal` is `"smart"` or `"instant"`, default `"smart"`.
- **`data-skullet-state` is server-owned. The engine must never write it** (nor `aria-busy`, nor `class` on the root). LiveView only patches attributes that changed against its own previous render, so a JS-side edit is silently permanent.
- The engine's own attributes are `data-skullet-phase` on the root and `data-skullet-overlay` on its overlay child; bars inside the shadow root carry `data-skullet-bar`.
- Timing constants, verbatim: hold 150 ms, fade 200 ms, height ease 280 ms, no-JS delayed reveal 5000 ms, shimmer slow 4000 / fast 2000 ms, pulse slow 2400 / fast 1200 ms, shimmer reference width 1280 px, band cap 320 px, band spacing 2.5 band-widths, slant 110deg, `LINE_GAP` 0.4 × fontSize.
- CSS custom properties, verbatim: `--skullet-base` (default `rgb(128 128 128 / 0.2)`), `--skullet-highlight` (`rgb(255 255 255 / 0.12)`), `--skullet-radius` (`0.25em`), `--skullet-animation` (`shimmer` | `pulse` | `none`, default `shimmer`), `--skullet-speed` (`slow` | `fast`, default `slow`), `--skullet-text-top` (`ascender` | `cap-height` | `x-height`, default `ascender`), `--skullet-text-bottom` (`baseline` | `descender`, default `descender`).
- Public Elixir surface is exactly `Skullet.skeleton/1`. Everything else in `lib/` is private.
- Commit messages are plain sentences in the style of the existing commit, no `feat:`/`fix:` prefixes.

## Review Focus

1. **Sample shorter or longer than the real data.** A user's `sample` is a guess; the real card may be 3× taller. Expected: the skeleton holds the sample's height, then the reveal eases to the real height in 280 ms instead of snapping, and nothing is left pinned afterwards. Task 6.
2. **Nothing to measure** (an empty component, or a component that is a single image). Expected: no bars is a valid skeleton — no exception, no permanently hidden content, reveal still happens. Tasks 4 and 6.
3. **A skeleton inside another skeleton's content** (a card with an async avatar well inside an async card). Expected: the outer measurement stops at the inner `.skullet` root and draws one block for it; the inner one keeps its own bars. Task 4.
4. **No canvas text metrics** (jsdom, an unusual browser, a canvas-blocking policy). Expected: bars still appear, centred in the line at 0.72 em, not absent and not a crash. Task 4.
5. **JS broken or absent on a real page.** Expected: the page shows the sample after 5 s rather than a blank box forever, and never flashes sample text while JS is working. Tasks 3 and 6.

---

### Task 1: The component's loading contract

**Files:**
- Modify: `mix.exs`
- Create: `lib/skullet.ex`
- Create: `test/support/test_components.ex`
- Create: `test/support/fixtures.ex`
- Create: `test/skullet_test.exs`
- Test: `test/skullet_test.exs`

**Interfaces:**
- Consumes: nothing.
- Produces: `Skullet.skeleton/1` with the attributes and slot listed in §1 of the spec. `Skullet.TestComponents.profile/1` (test-only) takes `:id, :async, :data, :loading, :theme, :label, :reveal` and renders `<.skeleton :let={user}>` around `<div id="content">{user.name}</div>`. `Skullet.Sample` module with `@sample_user` / `@real_user` maps (`%{name: String.t(), bio: String.t(), avatar: String.t()}`).

- [ ] **Step 1: Add the deps and the test support path**

In `mix.exs`, add to `project/0`: `elixirc_paths: elixirc_paths(Mix.env())`, and

```elixir
defp elixirc_paths(:test), do: ["lib", "test/support"]
defp elixirc_paths(_), do: ["lib"]

defp deps do
  [
    {:phoenix_live_view, "~> 1.2"},
    {:phoenix_html, "~> 4.3"},
    {:lazy_html, ">= 0.1.0", only: :test}
  ]
end
```

Run `mix deps.get`. Expected: resolves without adding a `phoenix` dependency. If `mix test` later reports `Phoenix.LiveViewTest` needs more, add `{:phoenix, "~> 1.8", only: :test}` rather than making it a runtime dep.

- [ ] **Step 2: Write the failing tests**

`test/support/fixtures.ex`:

```elixir
defmodule Skullet.Sample do
  def sample_user, do: %{name: "Sample Name", bio: "A sample bio long enough to wrap.", avatar: "/sample.png"}
  def real_user, do: %{name: "Real Name", bio: "The real bio.", avatar: "/real.png"}
end
```

`test/support/test_components.ex`:

```elixir
defmodule Skullet.TestComponents do
  use Phoenix.Component
  import Skullet

  attr :id, :string, required: true
  attr :async, :any, default: nil
  attr :data, :any, default: nil
  attr :loading, :boolean, default: false
  attr :theme, :map, default: %{}
  attr :label, :string, default: "Loading"
  attr :reveal, :string, default: "smart"
  slot :error

  def profile(assigns) do
    ~H"""
    <.skeleton
      :let={user}
      id={@id}
      sample={Skullet.Sample.sample_user()}
      async={@async}
      data={@data}
      loading={@loading}
      theme={@theme}
      label={@label}
      reveal={@reveal}
    >
      <div id="content">{user.name}</div>
    </.skeleton>
    """
  end

  def failed(assigns) do
    ~H"""
    <.skeleton id={@id} sample={Skullet.Sample.sample_user()} async={@async}>
      <div id="content">never</div>
      <:error><p id="error">Could not load.</p></:error>
    </.skeleton>
    """
  end
end
```

`test/skullet_test.exs`, in the style:

```elixir
defmodule SkulletTest do
  use ExUnit.Case, async: true
  import Phoenix.LiveViewTest
  alias Phoenix.LiveView.AsyncResult

  @sample Skullet.Sample.sample_user()
  @real Skullet.Sample.real_user()

  defp render(opts) do
    opts = Keyword.merge([id: "profile", async: nil, data: nil, loading: false, theme: %{}, label: "Loading", reveal: "smart"], opts)
    render_component(&Skullet.TestComponents.profile/1, opts)
  end

  test "a dead render is loading, and renders the sample" — asserts the html has data-skullet-state="loading", aria-busy="true", phx-hook="Skullet", class="skullet", id="profile", data-skullet-reveal="smart", and "Sample Name"
  test "a plain value is loaded" — data: @real → state "loaded", aria-busy "false", "Real Name", not "Sample Name"
  test "nil data is loading" — data: nil → "Sample Name"
  test "a resolved async assign is loaded" — async: AsyncResult.ok(%AsyncResult{}, @real) → "Real Name"
  test "an unresolved async assign is loading" — async: %AsyncResult{ok?: false} → "Sample Name"
  test "a failed async assign renders the error slot and no content pane" — via &Skullet.TestComponents.failed/1 with async: AsyncResult.failed(%AsyncResult{}, :boom) → has #error, has no [data-skullet-content], data-skullet-state="failed", aria-busy="false"
  test "the loading attribute wins over data" — data: @real, loading: true → "Sample Name", state "loading"
  test "the status span carries the label outside the content pane" — label: "Loading profile" → a .skullet-status with that text, and it is not inside [data-skullet-content]
end
```

- [ ] **Step 3: Run the tests, expect failure**

Run: `mix test test/skullet_test.exs`
Expected: FAIL — `Skullet.skeleton/1` is undefined (compile error on `import Skullet`).

- [ ] **Step 4: Implement `lib/skullet.ex`**

```elixir
defmodule Skullet do
  @moduledoc "…usage with `async`/`assign_async` and with plain `data`; the two wiring snippets from §4 of the spec…"

  use Phoenix.Component
  alias Phoenix.LiveView.AsyncResult

  attr :id, :string, required: true
  attr :async, :any, default: nil
  attr :data, :any, default: nil
  attr :sample, :any, required: true
  attr :loading, :boolean, default: false
  attr :reveal, :string, default: "smart", values: ~w(smart instant)
  attr :theme, :map, default: %{}
  attr :label, :string, default: "Loading"
  slot :error
  slot :inner_block, required: true

  def skeleton(assigns)
end
```

State derivation, in this order: `loading: true` → `{"loading", sample}`; `%AsyncResult{ok?: true, result: r}` → `{"loaded", r}`; `%AsyncResult{failed: reason}` where `reason != nil` → `{"failed", sample}`; `%AsyncResult{}` → `{"loading", sample}`; `data` not `nil` → `{"loaded", data}`; otherwise `{"loading", sample}`. The template renders the root `<div class="skullet" id={@id} phx-hook="Skullet" data-skullet-state={@state} data-skullet-reveal={@reveal} aria-busy={@state == "loading"} style={@style}>`, then `<span class="skullet-status">{@label}</span>`, then either `render_slot(@error)` when the state is `"failed"` or the `[data-skullet-content]` pane wrapping `render_slot(@inner_block, @value)`. Task 2 supplies `@style`; hardcode `nil` here.

- [ ] **Step 5: Run the tests, expect a pass**

Run: `mix test test/skullet_test.exs`
Expected: PASS, 8 tests.

- [ ] **Step 6: Commit**

```bash
git add mix.exs mix.lock lib/skullet.ex test/
git commit -m "Render the sample while a skeleton is loading"
```

---

### Task 2: Theme maps to custom properties

**Files:**
- Modify: `lib/skullet.ex`
- Test: `test/skullet_test.exs`

**Interfaces:**
- Consumes: `Skullet.skeleton/1` from Task 1.
- Produces: `theme` attr rendering as an inline `style` of custom properties; the accepted keys and their variables are exactly `base → --skullet-base`, `highlight → --skullet-highlight`, `radius → --skullet-radius`, `animation → --skullet-animation`, `speed → --skullet-speed`.

- [ ] **Step 1: Write the failing tests**

Add to `test/skullet_test.exs`:

```elixir
test "a theme renders as custom properties on the root" — theme: %{base: "rgb(0 0 0 / 0.1)", radius: "8px"} → root style contains "--skullet-base: rgb(0 0 0 / 0.1)" and "--skullet-radius: 8px"
test "string keys are accepted" — theme: %{"speed" => "fast"} → "--skullet-speed: fast"
test "an empty theme renders no style attribute" — theme: %{} → the root element has no style attribute
test "non-string values are stringified" — theme: %{radius: 8} → "--skullet-radius: 8"
test "an unknown key raises" — theme: %{colour: "red"} → assert_raise ArgumentError, ~r/allowed keys/
```

- [ ] **Step 2: Run to verify failure**

Run: `mix test test/skullet_test.exs`
Expected: FAIL on the first theme test — no `style` attribute.

- [ ] **Step 3: Implement `theme_style/1` in `lib/skullet.ex`**

Signature: `defp theme_style(theme :: map()) :: String.t() | nil`. Empty map → `nil`. Each pair renders `"#{var}: #{value}"`, joined by `"; "`. Key lookup goes through a module attribute map of the five atoms; accept string keys by converting atom-able strings; anything else raises `ArgumentError` naming the theme key and the allowed keys.

- [ ] **Step 4: Run to verify a pass**

Run: `mix test test/skullet_test.exs`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/skullet.ex test/skullet_test.exs
git commit -m "Theme a skeleton with custom properties"
```

---

### Task 3: Page CSS, the no-JS fallback, and the browser test harness

**Files:**
- Create: `priv/static/skullet.css`
- Create: `js/package.json`
- Create: `js/test/harness.js`
- Create: `js/fixtures/css.html`
- Create: `js/test/css.test.js`
- Create: `.gitignore` (add `js/node_modules`)

**Interfaces:**
- Consumes: the markup from Task 1 (class names and attributes).
- Produces: `withPage(fn, opts) → Promise` and `open(page, fixtureName) → Promise` from `js/test/harness.js`; `opts` may be `%{javaScriptEnabled: false, colorScheme, reducedMotion}`. Fixtures are served at `http://skullet.test/fixtures/<name>.html`; `/fixtures/*` maps to `js/fixtures/`, every other path maps to `priv/static/`.

- [ ] **Step 1: Build the harness and a failing test**

`js/package.json`:

```json
{
  "name": "skullet-tests",
  "private": true,
  "type": "module",
  "scripts": { "test": "node --test test/" },
  "devDependencies": { "playwright": "^1.56.0" }
}
```

Run `npm install --prefix js` then `npx --prefix js playwright install chromium`.

`js/test/harness.js` exports `withPage(callback, opts = {})`: launches chromium once per module, creates a context with `opts`, a page, routes `http://skullet.test/**` to files on disk with the right `content-type` (`text/javascript` for `.js` — a wrong type silently breaks module loading), and closes everything afterwards. Export `open(page, name)` → `page.goto("http://skullet.test/fixtures/" + name + ".html")`.

`js/fixtures/css.html` is Task 1's markup, plus `<link rel="stylesheet" href="/skullet.css">`, one root in `data-skullet-state="loading"` and one in `"loaded"`, each with a `.skullet-content` holding `<p>Sample text</p>`.

`js/test/css.test.js`:

```js
test("the content pane is hidden while loading", …)      // computed visibility of the loading root's pane === "hidden"
test("the content pane is visible once loaded", …)       // "visible"
test("the status span is visually hidden but present", …) // width <= 1 && height <= 1, textContent non-empty
test("theme defaults are on :root", …)                    // getPropertyValue("--skullet-base") is non-empty, same for highlight/radius/animation/speed
test("dark mode changes the base and highlight", …)       // withPage(..., {colorScheme: "dark"}) → both differ from the light values
test("with JS disabled the sample appears within 6s", …)  // {javaScriptEnabled: false}, wait 6000ms, computed visibility === "visible"
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test --prefix js`
Expected: FAIL — 404s on `/skullet.css`, so the first two assertions fail (visibility `visible` while loading).

- [ ] **Step 3: Write `priv/static/skullet.css`**

Contents, in this order:
1. `:root` defaults for the five theme variables, then a `@media (prefers-color-scheme: dark)` block overriding `--skullet-base` and `--skullet-highlight` only.
2. `.skullet { position: relative; }`
3. `.skullet > [data-skullet-overlay] { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }`
4. `.skullet-status` — the standard visually-hidden recipe (`position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0;`).
5. `.skullet[data-skullet-state="loading"] > [data-skullet-content] { visibility: hidden; animation: skullet-nojs-reveal 0s 5000ms forwards; }` with `@keyframes skullet-nojs-reveal { to { visibility: visible; } }`, and `.skullet[data-skullet-phase] > [data-skullet-content] { animation: none; }` so an initialised engine cancels the fallback.

- [ ] **Step 4: Run to verify a pass**

Run: `npm test --prefix js`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add .gitignore priv/static/skullet.css js/package.json js/package-lock.json js/test js/fixtures
git commit -m "Show a skeleton's sample only when JS can draw it"
```

---

### Task 4: Measure the sample and draw the bars

**Files:**
- Create: `priv/static/measure.js`
- Create: `priv/static/metrics.js`
- Create: `priv/static/engine.js`
- Create: `priv/static/skullet.js`
- Create: `js/fixtures/measure.html`
- Create: `js/test/measure.test.js`
- Test: `js/test/measure.test.js`

**Interfaces:**
- Consumes: the markup from Task 1, the CSS from Task 3.
- Produces:
  - `measure.js`: `measure(contentEl: Element, originEl: Element) → { lines: TextLine[], blocks: Rect[] }`, `Rect = { x, y, width, height }`, `TextLine = Rect & { font: string, fontSize: number, textTop: string, textBottom: string }`; `mergeLines(rects, fontSize) → Rect[]`; `LINE_GAP = 0.4`.
  - `metrics.js`: `barBox(line: TextLine) → { y: number, height: number }`; `resetFontCache()`.
  - `engine.js`: `class SkulletEngine { constructor(root: Element); start(); beforeUpdate(); update(); destroy() }` — only `start()` and `destroy()` are meaningful until Task 6.
  - `skullet.js`: `attach(root: Element) → SkulletEngine`; `SkulletHook` = `{ mounted, beforeUpdate, updated, destroyed }` delegating to it.
  - Overlay: `<div data-skullet-overlay aria-hidden="true">` inside the root, `attachShadow({ mode: "open" })`, bars as `<span data-skullet-bar>` positioned by `transform: translate(x, y)` with width/height and `background: var(--skullet-base)`.

- [ ] **Step 1: Build the fixture and the failing tests**

`js/fixtures/measure.html`: a 600 px wide root, `data-skullet-state="loading"`, `data-skullet-phase` set by the fixture script after `attach()`, and this content:

```html
<div class="skullet-content" data-skullet-content>
  <p id="single" style="white-space: nowrap">one line</p>
  <p id="three">first<br>second<br>third</p>
  <p id="inline">some <b>bold</b> and <i>italic</i> text</p>
  <p id="empty"></p>
  <img id="img" width="80" height="80" alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" />
  <span id="chip" style="background:#eee;padding:4px 8px;border-radius:99px">New</span>
  <span id="sr" style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)">hidden</span>
  <div id="inner" class="skullet" phx-hook="Skullet" data-skullet-state="loaded">
    <div class="skullet-content" data-skullet-content><p>inner</p></div>
  </div>
</div>
```

`js/test/measure.test.js` — assertions, each against the shadow bars' `getBoundingClientRect()` relative to the overlay:

```js
test("one bar per line of text", …)            // #single → exactly 1 bar; #three → exactly 3 bars, in vertical order
test("text lines are trimmed to the font, inside the line box", …) // every #three bar's top >= line top and bottom <= line bottom, height < line-height (24px)
test("inline markup stays one bar per line", …) // #inline → 1 bar
test("media is one block at its box", …)        // #img → 1 bar exactly 80×80 at the image's offset (within 0.5px)
test("a painted box is one block at its box", …) // #chip → 1 bar, width/height equal to the chip's own bounding rect (within 0.5px)
test("visually hidden text draws nothing", …)   // no bar overlaps #sr's rect
test("an empty paragraph draws nothing", …)     // #empty contributes no bar
test("a nested skeleton draws as one block and is not measured through", …) // exactly 1 bar over #inner's box; no bar inside it for the inner <p>
test("nothing to measure still initialises", …) // a root whose pane is empty → 0 bars, no thrown page error
test("bars fall back without canvas metrics", …) // page.evaluate stubs getContext("2d") to null before attach → bars still exist, one per line, centred in the line at ≤ 0.75 × fontSize tall
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test --prefix js` (only `js/test/measure.test.js`)
Expected: FAIL — `/skullet.js` 404s; no `[data-skullet-overlay]` in the DOM.

- [ ] **Step 3: Implement `measure.js`**

Walk the pane with a `TreeWalker` (`SHOW_TEXT | SHOW_ELEMENT`). Skip `script`, `style`, `template`, `noscript`. A nested skeleton — an element with `phx-hook="Skullet"` (or `class` containing `skullet`) — emits one block for its own box and is **not** descended into, so the inner skeleton keeps its own bars. For text nodes: skip blank text, skip when the parent's box is under 2×2, `Range.selectNodeContents` + `getClientRects()`, drop zero-size rects, then `mergeLines`. For elements: media tags and painted boxes (`isPainted` per §5) emit a block; do not double-count a media element's own text. All rects are translated by the origin element's bounding rect. Read `font` (`"#{fontStyle} #{fontWeight} #{fontSize} #{fontFamily}"`), `fontSize` in px, `--skullet-text-top`, `--skullet-text-bottom` from the text node's parent's computed style.

- [ ] **Step 4: Implement `metrics.js`**

`barBox(line)` builds a cached canvas metrics record per `line.font` (`fontBoundingBoxAscent/Descent`, `actualBoundingBoxAscent` for `bdfhkl` / `H` / `xz`, `actualBoundingBoxDescent` for `gjpqy`), computes the baseline as line top + (line height − font box) / 2 + ascent, and returns the bar from the `textTop` rule to the `textBottom` rule. No canvas (`getContext("2d")` null, or jsdom) → `{ y: line.y + (line.height − h) / 2, height: min(0.72 × fontSize, line.height) }`.

- [ ] **Step 5: Implement `engine.js` and `skullet.js`**

`start()`: create the overlay + open shadow root, put one `<style>` in it (`:host`/bar rules), cancel the no-JS animation by setting `data-skullet-phase="bars"` on the root, draw, and wire the observers (see Task 6 for reveal; here just draw on `ResizeObserver`/`MutationObserver`/`fonts.ready`/image `load`). Coalesce every observer callback into one `requestAnimationFrame` draw, so a burst of mutations measures once. `draw()` is `measure()` → `barBox()` for lines → replace the shadow bars in one pass. `destroy()` removes the overlay, the phase attribute, and every observer. `skullet.js` is the four-line hook adapter over `attach`.

- [ ] **Step 6: Run to verify a pass**

Run: `npm test --prefix js`
Expected: PASS, 16 tests (6 CSS + 10 measure).

- [ ] **Step 7: Commit**

```bash
git add priv/static/measure.js priv/static/metrics.js priv/static/engine.js priv/static/skullet.js js/fixtures/measure.html js/test/measure.test.js
git commit -m "Draw a skeleton from the sample's measured lines"
```

---

### Task 5: Shimmer and motion

**Files:**
- Create: `priv/static/shimmer.js`
- Modify: `priv/static/engine.js`
- Create: `js/fixtures/shimmer.html`
- Create: `js/test/shimmer.test.js`
- Test: `js/test/shimmer.test.js`

**Interfaces:**
- Consumes: `SkulletEngine` and the bar elements from Task 4.
- Produces: `shimmer.js`: `motionOf(element) → { animation: "shimmer" | "pulse" | "none", duration: number }`; `drawShimmer(bar: HTMLElement, width: number, motion) → void`; `SHIMMER_DURATIONS = { slow: 4000, fast: 2000 }`, `PULSE_DURATIONS = { slow: 2400, fast: 1200 }`, `REFERENCE_WIDTH = 1280`, `MAX_BAND = 320`, `SPACING = 2.5`, `SLANT = "110deg"`.

- [ ] **Step 1: Build the fixture and the failing tests**

`js/fixtures/shimmer.html`: two roots, each 640 px wide with one paragraph, a script that exposes `window.mount = (id) => attach(document.getElementById(id)).start()`.

```js
test("bars shimmer by default", …)                     // animationName is "skullet-shimmer"; backgroundImage contains "repeating-linear-gradient(110deg"
test("the pace follows the width", …)                  // at 640px and slow, animationDuration is "2000ms"; at 1280px it is "4000ms"
test("fast halves it", …)                              // --skullet-speed: fast at 640px → "1000ms"
test("two roots share one sweep", …)                   // clock: mount at 0, mount at 1000, then (−delay mod duration) differs by 1000 ± 20
test("pulse and none are honoured", …)                  // --skullet-animation: pulse → animationName "skullet-pulse", duration 2400ms; none → no animation on the bars
test("reduced motion stops every animation", …)         // reducedMotion: "reduce" → getAnimations() on the bars is empty
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test js/test/shimmer.test.js`
Expected: FAIL — no `animationName` on the bars.

- [ ] **Step 3: Implement `shimmer.js`**

`motionOf` reads `--skullet-animation` and `--skullet-speed` off `getComputedStyle(element)`, validating against the allowed values with the documented fallbacks. `drawShimmer` builds `repeating-linear-gradient(110deg, …)` with a band of `min(MAX_BAND, …)`, stops spaced `SPACING` band-widths apart, sets `backgroundImage`, `animationName`, `animationDuration` = `duration × width / REFERENCE_WIDTH` clamped to ≥ 1 ms, `animationTimingFunction: "linear"`, `animationIterationCount: "infinite"`, and `animationDelay` = `-((document.timeline.currentTime ?? performance.now()) % duration)` so every bar joins the sweep already running. `none` sets no animation. `pulse` sets `animationName: "skullet-pulse"` with the pulse duration and a keyframe in the shadow stylesheet.

- [ ] **Step 4: Wire it into `engine.js`**

`draw()` calls `motionOf(root)` once per pass and `drawShimmer(bar, rect.width, motion)` per bar.

- [ ] **Step 5: Run to verify a pass**

Run: `npm test --prefix js`
Expected: PASS, 22 tests.

- [ ] **Step 6: Commit**

```bash
git add priv/static/shimmer.js priv/static/engine.js js/fixtures/shimmer.html js/test/shimmer.test.js
git commit -m "Shimmer every skeleton on one clock"
```

---

### Task 6: Reveal, resize, and teardown

**Files:**
- Create: `priv/static/reveal.js`
- Modify: `priv/static/engine.js`
- Create: `js/fixtures/reveal.html`
- Create: `js/test/reveal.test.js`
- Test: `js/test/reveal.test.js`

**Interfaces:**
- Consumes: `SkulletEngine`, `attach`, the bars from Tasks 4–5, `data-skullet-state` from Task 1.
- Produces: `reveal.js`: `HOLD_MS = 150`, `FADE_MS = 200`, `RESIZE_MS = 280`, `prefersReducedMotion() → boolean`, `fadeIn(el, duration) → Animation`, `fadeOut(el, duration) → Animation`, `easeHeight(el, from, to, duration) → Animation`, `settle(el)` (clears inline height/overflow/opacity). Engine gains: hold timer, `beforeUpdate()`, `update()`, self-resize suppression.

- [ ] **Step 1: Build the fixture and the failing tests**

`js/fixtures/reveal.html`: one root whose script exposes `window.harness = { mount(), swap(html, state) }`, where `swap` sets the pane's `innerHTML`, flips `data-skullet-state`, and calls `engine.beforeUpdate()` then `engine.update()` — exactly what the hook does.

```js
test("data inside the hold never shows a skeleton", …)   // clock: mount, runFor(100), swap("loaded") → no [data-skullet-bar], no content animation (getAnimations().length === 0), content visible
test("bars wait out the hold", …)                        // clock: mount → overlay bars present but root has data-skullet-phase="holding", computed opacity 0; runFor(200) → opacity 1
test("a shown skeleton crossfades", …)                   // clock: mount, runFor(300), swap → content getAnimations() has one of duration 200; bars fade out and are gone after a real 400ms wait; content opacity is 1
test("a taller reveal eases, then settles", …)           // sample 1 line, real 5 lines → root style.height set during, `easeHeight` animation present with duration 280, after a real 600ms wait the inline height is cleared and root height equals the content's height
test("a shorter reveal eases down", …)                   // mirror of the previous
test("nothing to measure still reveals", …)              // empty pane swapped to content → no exception, content visible, no bars left
test("instant skips the hold and the fade", …)           // data-skullet-reveal="instant" → bars appear immediately at mount and are removed on swap; content has no animation
test("reduced motion reveals instantly", …)              // reducedMotion: "reduce" → no content animation, no height animation
test("destroy leaves nothing behind", …)                 // destroy() → no [data-skullet-overlay], no data-skullet-phase, no inline height; a later swap adds no bars and throws nothing
test("a second loading cycle shows the skeleton again", …) // loaded, then swap(sample, "loading") and update() → bars return, phase is "holding" again, content hidden; after a real 250ms wait the phase is "bars" and a following swap reveals it once more
test("the no-JS fallback is cancelled once bars are up", …) // computed animationName on the content pane is "none" after mount
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test js/test/reveal.test.js`
Expected: FAIL — a swap leaves the bars in place and never touches the pane.

- [ ] **Step 3: Implement `reveal.js`**

`fadeIn`/`fadeOut` are `el.animate([{ opacity }, { opacity }], { duration, easing: "ease", fill: "forwards" })`; `fadeOut` resolves a promise on `finish`. `easeHeight` animates `height` from `from` to `to` with `fill: "forwards"` and an ease-in-out curve. `settle(el)` removes `style.height`, `style.overflow`, and any `style.opacity` left by a fade, and cancels pending animations on `el` — so a patch that never lands cannot leave the pane invisible. `prefersReducedMotion` wraps `matchMedia("(prefers-reduced-motion: reduce)").matches`.

- [ ] **Step 4: Implement the engine's lifecycle**

- `start()`: after `draw()`, if the state is `"loading"` set `data-skullet-phase="holding"` and start a `HOLD_MS` timer that flips the phase to `"bars"`. If the state is already `"loaded"`, draw nothing and leave the content alone. `"instant"` skips the hold.
- `beforeUpdate()`: if the state is still `"loading"` and the phase is `"bars"` and motion is not reduced — pin `root.style.height` to its current height, set `overflow: hidden`, and `fadeIn(pane, FADE_MS)`. Otherwise mark this pass as instant.
- `update()`: read the state. `"loaded"` → `destroy` the bars (`fadeOut` the overlay then remove it), measure the new content, `easeHeight(root, pinned, target, RESIZE_MS)`, then `settle(root)` and `settle(pane)`; if the pass was instant, skip both animations and just remove the overlay. Still `"loading"` → `settle` anything half-done, `draw()` again, and re-enter the hold (phase `"holding"` + timer) when the state arrived from `"loaded"` — a refetch that was explicitly reset to `AsyncResult.loading()` gets the same treatment as a first load.
- Suppress the engine's own resize observer entries while an `easeHeight` runs.
- `destroy()`: clear the timer, cancel animations, remove the overlay, remove `data-skullet-phase`, remove inline height/overflow, disconnect everything.

- [ ] **Step 5: Run to verify a pass**

Run: `npm test --prefix js`
Expected: PASS, 33 tests.

- [ ] **Step 6: Run the whole suite**

Run: `mix format --check-formatted && mix compile --warnings-as-errors && mix test && npm test --prefix js`
Expected: all pass, 13 Elixir tests, 33 JS tests.

- [ ] **Step 7: Commit**

```bash
git add priv/static/reveal.js priv/static/engine.js js/fixtures/reveal.html js/test/reveal.test.js
git commit -m "Reveal the content over its skeleton"
```

---

### Task 7: Documentation

**Files:**
- Modify: `README.md`
- Modify: `lib/skullet.ex` (`@moduledoc`)
- Test: `mix test`, `mix format --check-formatted`

**Interfaces:**
- Consumes: everything above.
- Produces: nothing consumed by code.

- [ ] **Step 1: Write the README**

Sections: what it does (one paragraph, the sample-render idea); installation (`{:skullet, "~> 0.1.0"}`); the LiveView wiring (`hooks: { Skullet: SkulletHook }` importing `../../deps/skullet/priv/static/skullet.js`, and the `@import` of `skullet.css` in `assets/css/app.css`); a `assign_async` example; a plain `data` example; the attributes table from §1 of the spec; theme variables from §8; what is not implemented yet (the spec's non-goals), naming shape memory and hints first, since those are what readers will look for; a note that a generated `id` would remount the hook, hence required.

- [ ] **Step 2: Write the `@moduledoc`**

Same content, tighter: the two usage modes, the `:let` contract (sample while loading, real value once loaded), the two wiring snippets, and a note that `sample` is required.

- [ ] **Step 3: Verify**

Run: `mix format --check-formatted && mix compile --warnings-as-errors && mix test && npm test --prefix js`
Expected: pass; the moduledoc compiles without warnings.

- [ ] **Step 4: Commit**

```bash
git add README.md lib/skullet.ex
git commit -m "Document the skeleton component and its wiring"
```
