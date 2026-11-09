# Internals

## How it works

Skullet does not guess at sizes: it lets the browser lay out the real content, then reads
the result.

- **Layout by the browser.** Your content renders in place from the closest data there is
  — the sample, or the data a previous cycle remembered — with its text transparent and its
  media hidden. Every size and line break is the browser's own.
- **Lines from the DOM.** Each text node is measured with `Range.getClientRects()`, which
  returns one box per line it wraps to. Images, controls and painted boxes such as buttons
  and chips are measured whole.
- **Heights from the font.** A line box is taller than its letters, so each bar is trimmed
  to the font's own metrics, read once per font with canvas `measureText`: ascender to
  descender by default.
- **Drawn on top.** The bars are absolutely positioned over the unseen content, in a shadow
  root the page's CSS cannot reach. Every bar shares one shimmer, timed by the document
  clock and its place on the page.
- **Kept current.** A `ResizeObserver`, a `MutationObserver`, image loads and font loads
  trigger a re-measure.

## First paint

The server renders the sample, so the layout is right from the first byte, but the bars are
drawn by JavaScript: between the first paint and the bundle running, a loading skeleton is
an empty box. `<Skullet.Boot.boot/1 />` closes that gap by inlining `priv/static/skullet.pre.js`
— a self-contained bundle of the same measuring, metrics and shimmer code — as a
synchronous `<script>`. It paints before first paint, and the engine takes the bars over
when it starts.

Place it once per page, at the end of `<body>`; see [usage](usage.md#before-the-first-paint)
for the CSP nonce.

## Working on the engine

The package needs no Node: the compiled engine is committed in `priv/static`. Changing it
needs pnpm and Node:

```bash
pnpm --dir js install --allow-build=esbuild   # esbuild's postinstall is declined by default
pnpm --dir js run check   # tsc (type check), oxlint, oxfmt --check
pnpm --dir js build       # js/src/*.ts → priv/static/skullet{.js,.min.js}, then skullet.pre.js
pnpm --dir js test        # builds, then drives Playwright against js/fixtures
```

`oxfmt` reads `js/.oxfmtrc.json`; run the scripts through `pnpm --dir js` (or from inside
`js/`) so it finds the config.

`priv/static` holds bundles, not a file per module: one ESM bundle for bundlers, one
minified script for a `<script>` tag, both maps-free except the script build, plus the
hand-written `skullet.d.ts`. `pnpm --dir js verify` rebuilds and fails if the committed
files would change.

## Before finishing a change

`mix ci` runs the whole quality gate — `compile --warnings-as-errors`, `format
--check-formatted`, `coveralls` (the test suite, with line coverage and a 95% floor),
`credo --strict`, `dialyzer`, `spec_lint --warnings-as-errors`, `ex_dna --max-clones 0` and
`reach.check --arch --smells` — set up by
[VibeKit](https://github.com/elixir-vibe/vibe_kit). `mix coveralls.html` writes the
per-line report to `cover/`.

## The demo app

`example/` is a Phoenix LiveView app using the component on a real `assign_async`, with a
button that pins the loading state:

```bash
cd example && mix deps.get && mix assets.setup && mix phx.server
```

It runs at <http://localhost:4000>; `example/README.md` covers what each card shows and how
it is deployed.
