# Skullet

Draws a skeleton of exactly what is about to load.

Your own component renders from sample data with its text transparent; the browser lays it
out for real; rounded bars are drawn over it — one per wrapped line of text, one block per
image or control — in a shadow root. Nothing is guessed, so nothing moves when the content
arrives. A [port of Skullet](https://skullet.lochie.me/docs) to Phoenix LiveView.

## Installation

```elixir
def deps do
  [
    {:skullet, "~> 0.1.0"}
  ]
end
```

Two lines of wiring, in `assets/js/app.js` and `assets/css/app.css`:

```js
import { SkulletHook } from "../../deps/skullet/priv/static/skullet.js"

let liveSocket = new LiveSocket("/live", Socket, { hooks: { Skullet: SkulletHook } })
```

```css
@import "../../deps/skullet/priv/static/skullet.css";
```

With a `path:` or `git:` dependency there is no `deps/skullet` directory — point the two
imports at that checkout instead.

The CSS file is not optional: it is what keeps the sample invisible before the engine runs.

## Before the first paint

The sample is laid out from the server's HTML, but the bars are drawn by JavaScript — so
until the bundle loads and the LiveView mounts, the page shows an empty box. One component
closes that gap:

```heex
<%!-- once per page, at the end of <body>, after the markup it measures --%>
<Skullet.Boot.boot nonce={assigns[:csp_nonce]} />
```

It inlines a ~9KB script that measures and draws every loading skeleton **synchronously,
before the browser's first paint**, using the same geometry, font metrics and shimmer code
as the engine; the engine then takes those bars over.

It is a plain `<script>`, so a Content Security Policy needs its nonce. Phoenix does not
generate one for you — whatever puts your policy in place has to make it, remember it, and
pass it along:

```elixir
# a plug, for a policy like: script-src 'self' 'nonce-…'
def put_csp_nonce(conn, _opts) do
  nonce = Base.url_encode64(:crypto.strong_rand_bytes(16), padding: false)

  conn
  |> assign(:csp_nonce, nonce)
  |> put_resp_header("content-security-policy", "script-src 'self' 'nonce-#{nonce}';")
end
```

In a LiveView the layout is rendered from the socket's assigns, so copy the nonce across
once — an `on_mount` that does `assign(socket, :csp_nonce, conn.assigns.csp_nonce)` is
enough. Without a CSP, leave the attribute off.

## With an async assign

```elixir
def mount(%{"id" => id}, _session, socket) do
  {:ok, assign_async(socket, :user, fn -> {:ok, %{user: Accounts.get_user!(id)}} end)}
end
```

```heex
<Skullet.skeleton :let={user} id="profile" async={@user} sample={@sample_user}>
  <Profile.card user={user} />
</Skullet.skeleton>
```

While `@user` is loading, `Profile.card` is rendered from `@sample_user` and measured. When
the assign resolves and LiveView patches the real user in, the skeleton crossfades out.
During the dead render the skeleton is the whole page, so the layout never jumps on connect.

A background refetch keeps the content on screen: `assign_async/3` leaves the previous
result in place while the new one loads, and the skeleton only returns when the assign is
reset — pass `reset: true` (or assign a fresh `AsyncResult.loading()`).


## With plain data

```heex
<Skullet.skeleton :let={user} id="profile" data={@user} sample={@sample_user}>
  <Profile.card user={user} />
</Skullet.skeleton>
```

`data` that is `nil` means loading; anything else is loaded. Same component, same skeleton.

## Attributes

| attribute | type | default | what |
|---|---|---|---|
| `id` | string, required | — | DOM id for the hook; a generated one would change every render and remount the hook |
| `sample` | any, required | — | stands in for the data to draw the skeleton |
| `async` | `%AsyncResult{}` | `nil` | from `assign_async/3` |
| `data` | any | `nil` | plain data; `nil` is loading |
| `loading` | boolean | `false` | forces the skeleton, even over data |
| `reveal` | `"smart"` \| `"together"` \| `"sequence"` \| `"instant"` | `"smart"` | how content replaces its skeleton |
| `theme` | map | `%{}` | custom properties for this skeleton alone |
| `label` | string | `"Loading"` | read to screen readers while loading |
| `remember` | any | `nil` | opt in to memory under this scope (see below) |

Slots: `inner_block` (required, receives the sample then the real value) and `error`
(rendered in place of the content when the async assign failed).

## Theme

Everything is a CSS custom property, so one skeleton can differ from the page:

| variable | default | what |
|---|---|---|
| `--skullet-base` | `rgb(128 128 128 / 0.2)` | the bars |
| `--skullet-highlight` | `rgb(255 255 255 / 0.12)` | the shimmer's band |
| `--skullet-radius` | `0.25em` | how round each bar is |
| `--skullet-hold` | `150ms` | how long a skeleton waits before showing, so fast data never shows one |
| `--skullet-fade` | `200ms` | the crossfade at the reveal |
| `--skullet-resize` | `280ms` | the height ease when the real content is a different size |
| `--skullet-animation` | `shimmer` | `shimmer`, `group-shimmer`, `pulse` or `none` |
| `--skullet-speed` | `slow` | `slow` or `fast` |
| `--skullet-text-top` | `ascender` | `ascender`, `cap-height` or `x-height` — where each line's bar starts |
| `--skullet-text-bottom` | `descender` | `baseline` or `descender` — where it ends |

```heex
<Skullet.skeleton id="profile" sample={@sample_user} theme={%{speed: "fast", radius: "8px"}}>
  …
</Skullet.skeleton>
```

Colours follow the page's `color-scheme`, so a light page on a dark desktop keeps light
bars. Under `prefers-reduced-motion` bars hold still and every reveal is instant.

`shimmer` gives every bar its own band, all in one phase; `group-shimmer` sweeps a single
band across the whole skeleton, which reads better when the bars are close together. Both
follow the same rule as upstream: the band is capped at 320px, bands are 2.5 band-widths
apart on a 110° slant, and the loop is timed to a 1280px reference width so the pace is the
same on any screen.

## Boxes

For what cannot be measured — a logo, a chart, a canvas — put a box in the sample in place
of the thing:

```heex
<Skullet.box width={240} height={120} radius="12px" />
```

It is drawn as a single block, like anything marked `skullet-block`.

## Debugging

Add `?skullet-debug` to the URL to outline every skeleton: blue while it loads, then green
if the content arrived where the skeleton was, red with the distance in the title if it
moved. `skullet-debug` on any one element does the same for that subtree, and
`skullet-xray` on an ancestor shows the sample through the skeleton.

## Memory

The first skeleton of a session is drawn from your `sample`. Every one after that can be
drawn from the *real* data instead, which makes it exact at any viewport size:

```heex
<Skullet.skeleton :let={user} id="profile" async={@user} remember={@current_user.id}>
  <Profile.card user={user} />
</Skullet.skeleton>
```

`remember` is the scope — usually the user's id — and `id` completes the key. Once the
skeleton has shown real data, the next loading render uses that data in place of the
sample.

It is stored server-side (ETS), not in the browser: no shapes in `localStorage`, nothing
left on a shared device, and it works across devices because it is data rather than pixels.
It is per node, and it expires after `config :skullet, :memory_ttl_ms` (30 minutes by
default). Clear a person's memory when they sign out:

```elixir
Skullet.Memory.forget(current_user.id)
```

## Hints

Measuring gets most markup right. Where it does not — a logo, a chart, a canvas — say so
in the markup:

```heex
<div skullet-block>…</div>          <!-- one block, nothing inside it measured -->
<span skullet-ignore>New</span>     <!-- left out entirely -->
```

## Reveals

`smart` (the default) waits `--skullet-hold` (150 ms) before drawing a skeleton at all, so
data that lands quickly never shows one; then it crossfades over `--skullet-fade` (200 ms),
easing to the content's real height over `--skullet-resize` (280 ms) if the sample guessed
it wrong.

`together` is the crossfade without the wait. `sequence` takes the bars out one after
another, top to bottom. `instant` shows and removes the skeleton with no transition.

## Example app

`example/` is a Phoenix LiveView app using the component on a real `assign_async`, with a
button that pins the loading state. `cd example && mix deps.get && mix assets.setup &&
mix phx.server`, then open <http://localhost:4000/demo>.

## Not implemented yet

Per-component skeletons, the `sweep` reveal, a Suspense equivalent, and a provider-level
`mode` are not in this version.

## Plain pages

The engine does not need LiveView. Importing `priv/static/skullet.js` on a page with the
component's markup gives you `attach(root)`, which starts the engine on that element, and
`setDebug(on)`:

```js
import { attach, setDebug } from "../../deps/skullet/priv/static/skullet.js"

attach(document.querySelector(".skullet"))
```

## Working on the engine

Before finishing a change, `mix ci` runs the whole quality gate — `compile
--warnings-as-errors`, `format --check-formatted`, `test`, `credo --strict`, `dialyzer`,
`ex_dna --max-clones 0` and `reach.check --arch --smells` — set up by
[VibeKit](https://github.com/elixir-vibe/vibe_kit).

Apps consuming the package need no Node — the compiled engine ships in the package. Changing
it needs pnpm and Node:

```bash
pnpm --dir js install --allow-build=esbuild   # esbuild's postinstall is declined by default
pnpm --dir js run check   # tsc (type check), oxlint, oxfmt --check
pnpm --dir js build       # js/src/*.ts → priv/static/*.js, committed
pnpm --dir js test        # builds, then drives Playwright against js/fixtures
```

`oxfmt` reads `js/.oxfmtrc.json`; run the scripts through `pnpm --dir js` (or from inside
`js/`) so it finds the config.
