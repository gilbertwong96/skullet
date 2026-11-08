# Skullet demo

A Phoenix LiveView app showing `<Skullet.skeleton>` on real `assign_async` calls: the demo
page at `/` walks through the skeletons, the reveals, the theming and the parts you do
not see in the screenshots.

It depends on the library in this repo by path, and imports the engine and stylesheet
straight from `priv/static` — a `path:` dependency never lands in `deps/`, so
`deps/skullet/...` would not resolve. In your own app, with the package from Hex, the
imports in the [main README](../README.md) are the ones to use.

## Run it

```bash
cd example
mix deps.get && mix compile && mix assets.setup
mix phx.server          # → http://localhost:4000
```

## What is on the page

| demo | what it shows |
|---|---|
| From your component | the sample is measured, the real card replaces it |
| Changing size | a one-line sample, four lines of real content: the reveal eases to the height |
| Plain children | `data` plus your own `loading` toggle, no async at all |
| Your own skeleton | the `skeleton` slot: a chart drawn as a baseline and boxes |
| Hints | `skullet-ignore` leaves a badge out, `skullet-block` draws a logo whole |
| Memory | `remember` draws the next skeleton from the data this one last showed; **Forget** clears it |
| Reveal modes | `smart`, `together`, `sequence`, `sweep`, `instant`, replayed live |
| Your own reveal | `registerReveal("wipe-down", …)` in `assets/js/app.js`, asked for by name |
| Suspense and failure | async + measured fallback + one error branch, always failing here |
| Theming | one `<Skullet.provider>` with the controls panel above the page |
| A provider's mode | dark bars on a light page, from `color-scheme` |
| Images | four images served 1.2–3s late, fading in instead of popping |

The panel at the top sets latency, animation, speed, mode, radius, text metrics, hold,
reveal delay and enter filter for **every** demo, through the provider — no demo code
knows about it.

The footer shows the running engine: state, phase, bars drawn, and whether anything threw.

## Deploying to Fly.io

The Docker build cannot see `../` (the library), so `mix.exs` swaps the path dependency for
the GitHub one when `SKULLET_FROM_GIT` is set, and the generated `Dockerfile` sets it. That
means the deployed demo runs the library from `main` on GitHub, not from your working copy.

```bash
cd example
fly launch --copy-config --no-deploy    # keeps this fly.toml; change `app` if you like
fly secrets set SECRET_KEY_BASE="$(mix phx.gen.secret)"
fly deploy
```

`PHX_HOST` in `fly.toml` must match the app name (or your custom domain). There is no
database, so nothing else is needed.
