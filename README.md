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

The CSS file is not optional: it is what keeps the sample invisible before the engine runs.

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
| `reveal` | `"smart"` \| `"instant"` | `"smart"` | how content replaces its skeleton |
| `theme` | map | `%{}` | custom properties for this skeleton alone |
| `label` | string | `"Loading"` | read to screen readers while loading |

Slots: `inner_block` (required, receives the sample then the real value) and `error`
(rendered in place of the content when the async assign failed).

## Theme

Everything is a CSS custom property, so one skeleton can differ from the page:

| variable | default | what |
|---|---|---|
| `--skullet-base` | `rgb(128 128 128 / 0.2)` | the bars |
| `--skullet-highlight` | `rgb(255 255 255 / 0.12)` | the shimmer's band |
| `--skullet-radius` | `0.25em` | how round each bar is |
| `--skullet-animation` | `shimmer` | `shimmer`, `pulse` or `none` |
| `--skullet-speed` | `slow` | `slow` or `fast` |

```heex
<Skullet.skeleton id="profile" sample={@sample_user} theme={%{speed: "fast", radius: "8px"}}>
  …
</Skullet.skeleton>
```

Dark mode is a `prefers-color-scheme` block in `skullet.css`; override the two colours to
follow a different switch. Under `prefers-reduced-motion` bars hold still and every reveal
is instant.

## Reveals

`smart` (the default) waits 150 ms before drawing a skeleton at all, so data that lands
quickly never shows one; then it crossfades over 200 ms, easing to the content's real
height if the sample guessed it wrong. `instant` shows and removes the skeleton with no
transition.

## Not implemented yet

Skeleton shape memory, measurement hints (`skullet-block` / `skullet-ignore`),
per-component skeletons, the debug overlay, `SkeletonBox`, a Suspense equivalent, and the
`together` / `sequence` / `sweep` reveals are not in this version.

## Working on the engine

Apps consuming the package need no Node — the compiled engine ships in the package. Changing
it needs pnpm and Node:

```bash
pnpm --dir js install
pnpm --dir js build   # js/src/*.ts → priv/static/*.js, committed
pnpm --dir js test    # builds, then drives Playwright against js/fixtures
```
