# Skullet example

A Phoenix LiveView app showing `<Skullet.skeleton>` on a real async assign, with a button
that pins the loading state so you can look at the skeleton for as long as you like.

It depends on the library in this repo by path, and imports the engine and stylesheet
straight from `priv/static` — a `path:` dependency never lands in `deps/`, so
`deps/skullet/...` would not resolve. In your own app, with the package from Hex, the
imports in the [main README](../README.md) are the ones to use.

## Run it

```bash
cd example
mix deps.get
mix assets.setup     # downloads esbuild and tailwind once
mix phx.server
```

Then open <http://localhost:4000/demo>.

The green strip at the top of the page reports the running engine: state, phase, how many
bars are drawn, whether the pane is live and whether anything threw. It turns red when one
of those disagrees with what the page is showing — that is how the skeleton's own bugs were
caught, and it is the quickest way to tell "the engine is wrong" from "the page is stale".

## What to look at

- **On load** the skeleton holds, because the demo starts pinned. Press *Show loaded*: the
  card crossfades in, easing to the real height.
- **Press *Show loading***: the skeleton comes back, at full opacity, and stays as long as
  you leave it. This is the path that regressed twice; it has a test now.
- Press *Show loaded*, reload the page: the skeleton is now drawn from the **real** data
  (it passes `remember="demo"`), not from the sample — same size, so nothing moves. That is
  the shape memory, server-side.
- The state line reads `assign: … · pinned: …`, so you can see which of the two decides
  the visible state: `pinned` (the `loading` attribute) wins over the async assign.

`lib/skullet_demo_web/live/demo_live.ex` is the whole of it: a `sample` map, an
`assign_async/3` with 600 ms of latency, and the component call.
