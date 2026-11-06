# Skullet for Phoenix — design

## Intent

[Skullet](https://skullet.lochie.me/docs) (MIT, `lochie/skullet`) draws a skeleton of
exactly what is about to load: the real component is rendered from sample data with its
text transparent and its media hidden, the browser lays that out for real, and rounded bars
are drawn over it — one per wrapped line of text, one block per image or control. Nothing
is guessed, so nothing moves when the content arrives.

This project ports that idea to Phoenix, as a standalone Hex library, for two moments the
operator named as the ones that matter in their apps:

1. A LiveView waiting on an async assign (`assign_async/3`).
2. The dead render before mount.

This repo is a fresh `mix new skullet` (Elixir 1.20.5 / OTP 29, no deps, no commits).

## Goals

- `<Skullet.skeleton>`: a function component that renders your own component from sample
  data while loading, then from real data, and draws the measured skeleton in between.
- Works for both entry points above without different markup, and across a second
  loading cycle on the same element.
- Theme by CSS custom properties (`--skullet-base`, `--skullet-highlight`,
  `--skullet-radius`, `--skullet-animation`, `--skullet-speed`), with per-skeleton
  overrides.
- `smart` and `instant` reveals only.
- Accessible: skeleton hidden from screen readers, a `label` read in its place, reduced
  motion honoured.
- Degrades: with JS broken or absent the page must not sit on a blank box forever.

## Non-goals for v1

Deferred, in rough future order: shape memory (`localStorage`-equivalent, and the
server-side variant this platform makes possible), hints (`skullet-block` /
`skullet-ignore`), per-element own-skeletons (`Component.Skeleton`), the debug overlay,
`SkeletonBox`, `SkeletonSuspense` equivalent, the rest of the reveal-mode matrix
(`together`, `sequence`, `sweep`), custom `RevealSpec`s, image-decode-gated reveals,
`forgetShapes`, non-LiveView (controller-rendered) usage, a bundled demo app.

## Anti-goals

- A second skeleton to write and keep in step with the component. That is the thing this
  library exists to delete.
- Fake sample data ever reaching a screen reader or being shown as if it were content.
- A bundler, a minifier, or a runtime JS dependency. The engine is TypeScript compiled to
  plain ES modules that stay readable inside a consumer's bundle.

## Constraints

- Elixir 1.20.5, OTP 29, Phoenix LiveView 1.2.
- Node 26 and pnpm for dev and test only; no Node at runtime.
- The engine is TypeScript (`js/src/*.ts`) compiled by `tsc` to `priv/static/*.js`:
  `strict` and `noUncheckedIndexedAccess`, `nodenext` resolution — which means relative
  imports are written with a `.js` extension, or the output is not loadable.
- `target` and `lib` are both `ES2022`, and are raised together or not at all. That is the
  syntax floor and the built-in floor at once, and it matches what Phoenix 1.8's own
  generator hands esbuild (`--target=es2022`). The engine calls no built-in newer than
  2022 — `toSorted()`, `Object.groupBy` and the iterator helpers earn nothing here — and a
  higher `lib` would quietly raise the browser floor past the DOM APIs the engine already
  needs (Web Animations, `ResizeObserver`, shadow DOM, roughly 2021).
- The compiled output is committed, because a Hex consumer has no Node. `pnpm --dir js
  build` followed by `git diff --exit-code -- priv/static` guards against drift.
- The engine needs real layout. jsdom/happy-dom cannot test measurement (no
  `getClientRects` layout, no canvas text metrics) — upstream has the same constraint and
  tests in a browser.

## Approaches considered

1. **Measured engine.** Server renders the sample transparent, a `phx-hook` measures with
   `Range.getClientRects()` + canvas font metrics and draws bars in a shadow root;
   LiveView's `updated()` triggers the reveal. Exact; ~800–1000 lines of JS plus a CSS
   asset.
2. **CSS-only bars.** Same transparent sample, a repeating gradient sized to line-height
   draws a bar per line box; nothing measured. Cheap, resize-free, but bars follow the
   sample's line breaks rather than the real data's, and there is no shared shimmer phase.
3. **No library.** Hand-written `animate-pulse` skeleton wrappers in `core_components`.

Chosen: **1**, scoped as above. 2 loses the one property worth porting; 3 drifts from the
real markup and is the status quo this replaces. The CSS baseline that 2 describes is not
lost work — it is what the library needs anyway as the before-script state (below).

## The design

### 1. Public API

```elixir
defmodule Skullet do
  use Phoenix.Component

  attr :id, :string, required: true
  attr :async, :any, doc: "a %Phoenix.LiveView.AsyncResult{}"
  attr :data, :any, doc: "plain data; nil means loading"
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

```heex
<Skullet.skeleton :let={user} id="profile" async={@user} sample={@sample_user}>
  <Profile.card user={user} />
</Skullet.skeleton>

<Skullet.skeleton :let={user} id="profile" data={@user} sample={@sample_user}>
  <Profile.card user={user} />
</Skullet.skeleton>
```

`sample` is required: it is the only data available during a dead render, and the whole
point is that there is no second skeleton to write. `inner_block` receives the sample
while loading and the real value once loaded — one component tree either way, which is
what lets LiveView morph sample into content in place.

State, in order: `loading` attr wins → `:loading`; else `async` given → `AsyncResult.ok?`
→ `:loaded` with `result`, `failed` set → `:failed`, otherwise `:loading`; else `data`
given → `nil` is `:loading`, anything else `:loaded`; else `:loading`. On `:failed` the
`:error` slot renders if given, otherwise nothing.

`id` is required because `phx-hook` requires one; it also becomes the memory and debug key
later.

### 2. Rendered contract

```html
<div class="skullet" id={@id} phx-hook="Skullet"
     data-skullet-state={:loading | :loaded | :failed}
     data-skullet-reveal={@reveal}
     style={theme_vars(@theme)}>
  <span class="skullet-status">{@label}</span>
  <div data-skullet-overlay aria-hidden="true"></div>
  <div class="skullet-content" data-skullet-content>
    {render_slot(@inner_block, value)}
  </div>
</div>
```

- The root is `position: relative`; the overlay is `pointer-events: none`, so a fade in
  progress never eats a click.
- **The overlay element is rendered by the server.** LiveView prunes child elements it did
  not render, so an overlay the engine created itself is removed by the first patch — bars
  and reveal with it. The engine attaches its shadow root to the server's element and
  creates one only when a page left it out (verified against a real Phoenix app).
- `data-skullet-state` is **server-owned**. The engine never writes it. `aria-busy` is
  rendered from it too.
- The engine owns its own attributes (`data-skullet-phase`) and the shadow root.
- The status span is outside the content pane, so it is never measured.
- An async assign that succeeds with `nil` is `:loaded` with a `nil` let value; only a
  bare `data={nil}` means loading. This mirrors `AsyncResult`.

### 3. State machine and LiveView diffing

`data-skullet-state` is rendered by the server on every render, so LiveView sends an
attribute diff exactly when the state changes — including loading → loaded → loading
across a second `assign_async`. That is the whole cross-cycle mechanism, and it is why
the engine must never mutate that attribute: LiveView only patches what changed against
its own previous render, so a JS-side edit would be silently permanent.

Hook side:

- `mounted/1`: if `state == "loading"`, start the hold timer (smart) and draw bars; if the
  connect payload already carried `loaded` (data landed before the hook mounted), do
  nothing — CSS has already shown the content.
- `beforeUpdate/1`: if state is about to go loading → loaded, and the skeleton was
  actually on screen, set the fade-in phase and pin the root's height and `overflow:
  hidden` to the pre-patch value, before LiveView swaps the content. If the hold had not
  yet expired there is nothing on screen to fade: mark the reveal instant instead.
- `updated/2`: if state went loading → loaded, measure the new content, ease the root's
  height to it (then clear both), fade bars out. If state stayed `loading`, re-measure.
- `destroyed/1`: disconnect observers, cancel animations, remove the overlay and any
  inline height.

The content fade-in is a Web Animation on the content pane (`opacity` 0 → 1, 200 ms)
started in `beforeUpdate/1`, so the pane cannot be left invisible by a patch that never
lands: `fill: forwards` plus a 400 ms timer that clears the inline opacity whatever
happens.

### 4. JS engine

TypeScript in `js/src/`, compiled by `tsc` to `priv/static/*.js` — plain ES modules with
relative imports intact, so a consumer's esbuild follows them exactly as it would
hand-written source. No bundler, no runtime dependencies; the output stays readable in a
consumer's bundle and needs no source map. `js/src/skullet.ts` is the entry and emits
`priv/static/skullet.js` plus `skullet.d.ts`, which types the hook object for consumers.

One job per module: `skullet.ts` (entry and the `phx-hook` adapter over `attach/1`),
`engine.ts` (the root's state machine, overlay, observers, lifecycle), `measure.ts` (DOM
walk → line and block rects), `metrics.ts` (canvas font metrics → bar boxes), `shimmer.ts`
(gradient, pace, phase), `reveal.ts` (hold, fade, height ease, settle).

The engine takes a root element and a state string, with the hook as a thin adapter, so a
plain-HTML entry point can be added later without rewriting it.

The compiled files are committed: a Hex consumer has no Node. Editing the engine means
`pnpm --dir js build`; the suite builds first and then fails if `priv/static` is dirty.

Wiring in a consuming app:

```js
import { SkulletHook } from "../../deps/skullet/priv/static/skullet.js"
new LiveSocket("/live", Socket, { hooks: { Skullet: SkulletHook } })
```

```css
/* assets/css/app.css */
@import "../../deps/skullet/priv/static/skullet.css";
```

### 5. Measurement

Per measure pass, relative to the overlay's box:

- Walk the content pane's subtree with a `TreeWalker`.
- **Text nodes**: `Range.selectNodeContents` + `getClientRects()` → one rect per line box;
  drop zero-size rects and text inside boxes smaller than 2×2 (visually-hidden labels);
  merge rects that share a line (vertical overlap ≥ half the shorter rect, horizontal gap
  ≤ `0.4 × fontSize`) so inline markup stays one bar per line.
- **Media and controls** (`img`, `svg`, `video`, `canvas`, `iframe`, `input`, `select`,
  `textarea`, `button`, `picture`, `audio`, `object`, `embed`): whole box, one block.
- **Painted boxes** (non-transparent background, background image, painting box-shadow, or
  a full border): whole box, one block — a chip stays a chip.
- Never filter on computed `visibility`: the library itself sets `visibility: hidden` on
  the sample, and hidden elements still have layout boxes and rects — measuring while the
  pane is invisible is load-bearing. `display: none` needs no filtering (no boxes, no
  rects).
- Skip `script`, `style`, `template`, `noscript`.
- **Bar geometry** from font metrics, read once per unique computed font and cached:
  canvas `measureText` gives `fontBoundingBoxAscent/Descent` (the font box) and
  `actualBoundingBoxAscent` for cap-height/x-height/ascender ink. Baseline =
  line top + half-leading + ascent; the bar runs from the theme's `--skullet-text-top`
  (default `ascender`) to `--skullet-text-bottom` (default `descender`). No canvas
  (older test envs) → a bar centred in the line at 0.72 em.
- Bars are `position: absolute` spans in a shadow root, `overflow: hidden` on the overlay,
  positioned by `transform: translate()` plus width/height, `background: var(--skullet-base)`,
  `border-radius: var(--skullet-radius)`.
- Re-measure on: `ResizeObserver` (root and content), `MutationObserver` (content subtree),
  `document.fonts.ready`, and each content image's `load`.

Deliberately not in v1: corner-radius clipping of blocks inside rounded/overflow-hidden
ancestors, xray, per-element own-skeletons, hint attributes.

### 6. Shimmer

Each bar carries the highlight as a `repeating-linear-gradient(110deg, …)` with band width
`min(320px, …)`, bands spaced 2.5 band-widths apart, so every bar draws the same stream.
The animation's duration is one loop across a 1280 px reference width, scaled by the
measured width so the pace reads the same on any screen; the phase comes from
`document.timeline.currentTime`, so bars that mount late join the sweep already in
progress rather than restarting it.

`--skullet-animation`: `shimmer` (default), `pulse` (opacity loop), `none`.
`--skullet-speed`: `slow` (shimmer 4000 ms, pulse 2400 ms) or `fast` (2000/1200).
`prefers-reduced-motion` → no animation at all, and instant reveal.

### 7. Reveal

- `instant`: bars are removed and content shown in the same frame; no transition.
- `smart` (default):
  - **Hold**: bars stay invisible for the first 150 ms of loading, so data that lands
    quickly never shows a skeleton. Measured from hook mount, not from server paint.
  - **Reveal**: crossfade, 200 ms — bars fade out, content fades in. If the hold had not
    expired, nothing was on screen: reveal instantly, no fade.
  - **Resize**: if the real content's height differs from the sample's, the root's height
    eases from the old to the new over 280 ms (pinned in `beforeUpdate`, applied in
    `updated`) instead of snapping, with `overflow: hidden` for the duration.
  - Under reduced motion, smart behaves as instant.

Bars never move the page: the content pane is always laid out at the sample's height, so
the skeleton occupies real space in the document flow from the first paint.

### 8. Theming

Defaults live in `skullet.css` as custom properties, with a
`@media (prefers-color-scheme: dark)` block (a plain media query, not `light-dark()`, so
apps can override with one variable and no `color-scheme` requirement):

```css
:root {
  --skullet-base: rgb(128 128 128 / 0.2);
  --skullet-highlight: rgb(255 255 255 / 0.12);
  --skullet-radius: 0.25em;
  --skullet-animation: shimmer;
  --skullet-speed: slow;
}
```

The `theme` attr (map) renders the same variables as an inline style on the root, so one
skeleton can differ from the page. Accepted keys: `:base`, `:highlight`, `:radius`,
`:animation`, `:speed` (atom or string keys). Because custom properties inherit into
shadow trees, the overlay needs no theme plumbing of its own.

### 9. Accessibility and no-JS

- While loading: root `aria-busy="true"`, content pane `visibility: hidden` (out of the
  accessibility tree and out of tab order), status span holds `label`. The overlay is
  `aria-hidden`.
- On reveal the server flips the state, so the content is exposed with no JS involved.
- **Broken/absent JS must not leave a blank box.** `skullet.css` puts a delayed
  `visibility: visible` animation on the content pane (5 s, forwards); the engine cancels
  it as it initialises, before drawing any bars. With working JS the sample never appears;
  with broken JS the page shows the sample after 5 s instead of nothing. Faintly wrong
  beats permanently blank, and 5 s keeps it out of the way of normal loading.

### 10. File layout

```
lib/skullet.ex                    # the component
js/src/{skullet,engine,measure,metrics,shimmer,reveal}.ts
js/tsconfig.json                  # strict, nodenext, outDir ../priv/static
js/package.json                   # dev-only: typescript, playwright (pnpm)
js/test/*.test.js                 # node --test + playwright
js/fixtures/*.html                # static pages the browser tests drive
priv/static/skullet.css
priv/static/*.js, priv/static/*.d.ts   # compiled, committed
test/skullet_test.exs             # component tests
test/support/…                    # sample fixtures/components
docs/superpowers/{specs,plans}/…
```

`mix.exs` gains `phoenix_live_view ~> 1.2`, `phoenix_html ~> 4.3`, and `lazy_html` (test).

### 11. Testing

- **Elixir** (`mix test`, `render_component/2`): state derivation for every combination;
  the `:let` value is the sample while loading and the real value once loaded; the
  `data-skullet-state` attribute flips; `aria-busy`; `label`; theme map → inline style;
  `:error` slot on failure; missing `sample` warns at compile time.
- **JS** (`pnpm --dir js build && node --test` + Playwright/Chromium against static
  fixtures): the suite runs against the compiled modules, which is what consumers get.
  Bar count and geometry for known markup (one bar per wrapped line, block per image,
  painted chip as one block, visually-hidden label skipped, inline markup merged to one
  bar); bar positions within tolerance of the line boxes; shared shimmer phase across two
  mounts; hold, fade and height ease timings; `instant`; reduced motion; teardown removes
  observers and the overlay.
- Fixtures emulate the LiveView swap (replace the content pane, flip the state attribute,
  call the hook's lifecycle) so the engine can be verified end-to-end without a Phoenix app
  in CI. Component-to-hook integration is covered by the contract in §2–§3 plus a manual
  check in a real app before release.

## Milestones

1. Component + markup contract + CSS baseline + tests (server side only; sample hidden,
   content revealed by state).
2. Engine: measurement and static bars, no animation. Fixtures + geometry tests.
3. Shimmer and theming.
4. Reveal: hold, crossfade, height ease, instant, reduced motion; teardown.
5. Docs (`README`, moduledoc with the two usage modes and the two wiring snippets).

## Risks

- **Hook identity.** `phx-hook` needs a stable `id`; a LiveView that re-renders the parent
  with a changing id remounts the hook. Documented, and `id` is required rather than
  generated, because a generated id would change on every render.
- **Attribute ownership.** Any JS-side edit to a server-rendered attribute is not repaired
  by LiveView's next diff. The engine touches only its own attributes (see §3).
- **esbuild and `deps/` paths.** The import path above is the standard esbuild-from-`assets`
  pattern; a consuming app that copies assets elsewhere needs the vendored path. Documented
  in the README.
- **Observer feedback.** The height ease writes to the root the `ResizeObserver` watches.
  The engine ignores resize entries for the duration of its own ease, or the two chase each
  other.
- **Compiled output drifting from source.** Mitigated by the build-then-diff check; without
  it the library silently ships last week's engine.
- **Measurement cost.** A large view measures tens of thousands of nodes on mount. Budget:
  ≤ 4 ms for a 500-element subtree; re-measure is debounced to one frame.
- **Upstream drift.** Skullet is at v0.0.3 and may change; this design fixes its own
  contract and borrows only the geometry and motion ideas, not API compatibility.

## Left to the builder

- Exact bar inset and radius defaults that look right against Tailwind's type scale.
- Whether the overlay uses `contain: strict` and whether bars should be `<span>` or drawn
  as one `box-shadow`-composited layer (only if measurement shows a paint cost).
- Debounce/coalescing details for the observers.
- The precise easing curve for the height ease and the crossfade.
- Test tolerances for geometry assertions.
