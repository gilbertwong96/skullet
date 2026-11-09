# Skullet

[![coverage](https://codecov.io/gh/gilbertwong96/skullet/graph/badge.svg?branch=main)](https://codecov.io/gh/gilbertwong96/skullet)

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
imports at that checkout instead. The CSS file is not optional: it is what keeps the sample
invisible before the engine runs.

## The first skeleton

```heex
<Skullet.skeleton :let={user} id="profile" async={@user} sample={@sample_user}>
  <Profile.card user={user} />
</Skullet.skeleton>
```

While `@user` is loading, `Profile.card` is rendered from `@sample_user` and measured; when
the assign resolves, the skeleton reveals the real card in its place. `sample` is required
because it is the only data a dead render has, and `id` because the hook needs one and a
generated one would change every render.

Render `<Skullet.Boot.boot />` once in the layout and that first skeleton is drawn before
the browser paints it, rather than after the bundle loads. It is an inline script, so a
Content Security Policy needs its nonce — [usage](guides/usage.md#content-security-policy)
wires one through a plug, the session and the LiveView.

## Guides

- [Usage](guides/usage.md) — async assigns and plain data, attributes and slots, empty and
  error states, memory, images, plain pages without LiveView.
- [Theming](guides/theming.md) — every custom property, the `theme` map, and the provider
  that sets them in one place.
- [Reveals](guides/reveals.md) — how `smart` decides, the built-in modes, and specs of your
  own.
- [Internals](guides/internals.md) — how measuring works, first paint, the engine's build,
  the demo app.

API reference: `Skullet.skeleton/1`, `Skullet.provider/1`, `Skullet.box/1`,
`Skullet.Boot.boot/1`, `Skullet.Memory`. Changes are in the
[changelog](CHANGELOG.md).
