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

The image is built from the **repository root**, not from `example/`: the demo depends on
the library beside it (`{:skullet, path: ".."}`), and its stylesheet and engine are imported
straight out of `priv/static`. `example/Dockerfile` lays the repo out that way inside the
builder.

One `shared-cpu-1x` machine with 256MB, suspended when idle and resumed on the next request.
The live demo runs at <https://skullet-demo.fly.dev>.

The build happens on an amd64 machine, so run it there — an amd64 Linux box, a Fly
machine, or Apple Silicon with Rosetta enabled in Docker Desktop for amd64 emulation
(the Erlang VM crashes under plain QEMU):

```bash
# one-time, from the repository root
fly apps create skullet-demo                                    # or edit `app` / PHX_HOST
fly secrets set SECRET_KEY_BASE="$(cd example && mix phx.gen.secret)"

# deploy
fly deploy --ha=false --local-only \
  --config example/fly.toml --dockerfile example/Dockerfile
```

Drop `--local-only` to build on Fly's builders instead; they cannot always reach GitHub
for the Tailwind binary, which is why the command above builds in your own Docker.

- `--ha=false` keeps it to one machine; `fly scale count 1` if a second one appears.
- `auto_stop_machines = "suspend"` freezes the VM instead of shutting it down, so the next
  request wakes it in about a second without booting the release again. LiveView sockets
  drop while suspended; the page reconnects when the machine comes back.
- 256MB is the smallest machine. The release idles at roughly 140–160MB, so there is room
  for a handful of viewers; `fly scale vm shared-cpu-1x --memory 512` if you want more.
  Measured on the live app: suspended after ~6 minutes idle, 1.1s to wake and render.
- The build needs no database, only `SECRET_KEY_BASE`. `PHX_HOST` in `fly.toml` must match
  the app name (or your custom domain).
