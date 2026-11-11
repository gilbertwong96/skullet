# Skullet

[![CI](https://github.com/gilbertwong96/skullet/actions/workflows/ci.yml/badge.svg)](https://github.com/gilbertwong96/skullet/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/gilbertwong96/skullet/graph/badge.svg)](https://codecov.io/gh/gilbertwong96/skullet)
[![Elixir](https://img.shields.io/badge/elixir-1.18+-purple.svg)](https://elixir-lang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Hex.pm](https://img.shields.io/hexpm/v/skullet.svg)](https://hex.pm/packages/skullet)

Draws a skeleton of exactly what is about to load.

Your own component renders from sample data with its text transparent; the browser lays it
out for real; rounded bars are drawn over it — one per wrapped line of text, one block per
image or control — in a shadow root. Nothing is guessed, so nothing moves when the content
arrives. A [port of Skullet](https://skullet.lochie.me/docs) to Phoenix LiveView.

**[Live demo](https://skullet-demo.fly.dev/)** — every option on one page, running the
example app in this repo.

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

`priv/static` ships two bundles, their pre-paint script and the stylesheet; only the first
two are yours to import:

| file | what it is |
|---|---|
| `skullet.js` | the engine as one ES module — what a bundler imports |
| `skullet.min.js` | the same engine as a script, with its source map: it defines `window.Skullet` (`attach`, `setDebug`, `registerReveal`, `SkulletHook`) |
| `skullet.pre.js` | the pre-paint script `Skullet.Boot` inlines into the page, not a file you load |
| `skullet.css` | the stylesheet |

No build step? Serve the two files straight out of the dependency — `Plug.Static,
at: "/skullet", from: {:skullet, "priv/static"}` — or copy them where your static files live,
and use the engine off `window.Skullet`:

```html
<link rel="stylesheet" href="/assets/skullet.css">
<script src="/assets/skullet.min.js"></script>
<script>
  Skullet.attach(document.querySelector(".skullet"))
</script>
```

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
the browser paints it, rather than after the bundle loads.

Under a Content Security Policy, Skullet wants a nonce in two places, and neither of them
is `'unsafe-inline'`:

- `script-src` for the boot script above, which is inlined;
- `style-src` for the theme, which is emitted as a `<style>` block rather than a `style`
  attribute, since a nonce rescues the element and nothing rescues the attribute.

```heex
<Skullet.Boot.boot nonce={@csp_nonce} />
<Skullet.provider theme={%{radius: "6px"}} nonce={@csp_nonce}>
  …
</Skullet.provider>
```

[usage](guides/usage.md#content-security-policy) has the plug, the session hop and the rest.

## Where to read next

[Usage](guides/usage.md) covers the data sources, attributes, slots and the empty and error
states; [theming](guides/theming.md) the custom properties and the provider that sets them
in one place; [reveals](guides/reveals.md) how content replaces its skeleton; and
[internals](guides/internals.md) how measuring works and how the engine is built.

API reference: `Skullet.skeleton/1`, `Skullet.provider/1`, `Skullet.box/1`,
`Skullet.Boot.boot/1`, `Skullet.Memory`. Changes are in the
[changelog](CHANGELOG.md).
