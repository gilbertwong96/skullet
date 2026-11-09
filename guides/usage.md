# Usage

The component is one tag with a sample of the data that is coming, and whatever markup
should stand in for the content while it loads.

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
| `empty` | boolean | `false` | shows the `empty_message` slot in place of the content (see [empty states](#empty-states)) |
| `reveal` | `"smart"` \| `"together"` \| `"sequence"` \| `"instant"` | `"smart"` | how content replaces its skeleton (see [reveals](reveals.md)) |
| `theme` | map | `%{}` | custom properties for this skeleton alone (see [theming](theming.md)) |
| `label` | string | `"Loading"` | read to screen readers while loading |
| `remember` | any | `nil` | opt in to memory under this scope (see [memory](#memory)) |

Slots: `inner_block` (required, receives the sample then the real value), `skeleton` (your
own markup to measure instead of the sample — see [per-component
skeletons](#per-component-skeletons)), `error` (rendered in place of the content when the
async assign failed — see [errors](#errors)) and `empty_message` (rendered in place of the
content while `empty` is true — see [empty states](#empty-states)).

## Empty states

An empty result is neither loading nor an error: the data arrived and there is nothing in
it. `empty` swaps the content pane for the `empty_message` slot, and the reveal treats that
message as content — it measures it and eases to its height, with no skeleton of its own.

```heex
<Skullet.skeleton :let={messages} id="inbox" data={@messages} sample={@sample_messages}
  empty={@messages == []}>
  <Inbox.messages messages={messages} />
  <:empty_message>
    <p class="rounded-lg border border-dashed border-base-300 p-6 text-center text-sm">
      No messages yet.
    </p>
  </:empty_message>
</Skullet.skeleton>
```

It is your markup, styled none of it by the library — the same deal as the `error` slot.
Two rules keep it predictable:

- **Content first.** `empty` only replaces content that arrived. While the data is still
  missing the skeleton shows as usual (from the sample — the result is not known to be
  empty yet), and a failed assign still renders the `error` slot instead.
- **No message, no change.** Leave the slot out and the content stays: `empty` on its own
  renders what it always did.

With an async assign, emptiness rides on the result:

```heex
empty={@messages.ok? and @messages.result == []}
```

## Errors

The `error` slot is your markup, and the library styles none of it: an alert, an empty
state, a retry form, or the same card frame around all three. It replaces the content pane
when the assign failed, and the loading label goes with it.

```heex
<Skullet.skeleton :let={user} id="profile" async={@user} sample={@sample_user}>
  <Profile.card user={user} />
  <:error>
    <div class="rounded-lg border border-error/40 bg-error/10 p-4">
      <p class="text-sm">Could not load the profile.</p>
      <button phx-click="retry" class="btn btn-xs mt-2">Try again</button>
    </div>
  </:error>
</Skullet.skeleton>
```

Want the error inside your card — same border, same padding — rather than in place of it?
Render that frame in the slot:

```heex
<:error>
  <Profile.card user={@sample_user} class="opacity-60">
    <:footer><p class="text-sm">Could not load.</p></:footer>
  </Profile.card>
</:error>
```

## Boxes

For what cannot be measured — a logo, a chart, a canvas — put a box in the sample in place
of the thing:

```heex
<Skullet.box width={240} height={120} radius="12px" />
```

It is drawn as a single block, like anything marked `skullet-block`.

## Per-component skeletons

Some things measure badly however you mark them. Give the component a companion skeleton
and pass it to the `skeleton` slot — it is rendered and measured in place of the sample:

```heex
<Skullet.skeleton id="chart" async={@chart} sample={@sample}>
  <Chart.chart chart={…} />
  <:skeleton><Chart.skeleton /></:skeleton>
</Skullet.skeleton>
```

`Chart.skeleton/1` is ordinary markup — `<Skullet.box>` blocks, a placeholder axis, an
outline of the chart. It is only shown while loading, and the bars are measured from it
rather than from the real chart.

This is also the Suspense shape: an async assign, a measured fallback while it loads, and
one error branch. There is no separate component for it:

```heex
<Skullet.skeleton :let={quote} id="quote" async={@quote} sample={@sample_quote}>
  <Quote.quote quote={quote} />
  <:skeleton><Quote.quote quote={@sample_quote} /></:skeleton>
  <:error>Could not load the quote.</:error>
</Skullet.skeleton>
```

## Hints

Measuring gets most markup right. Where it does not — a logo, a chart, a canvas — say so
in the markup:

```heex
<div skullet-block>…</div>          <!-- one block, nothing inside it measured -->
<span skullet-ignore>New</span>     <!-- left out entirely -->
```

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

## Images

An image that is still decoding when the content arrives would pop in. It waits at zero
opacity and fades in when it is ready; one that never arrives shows after ten seconds
rather than staying hidden. Give images a `width` and `height` (or an `aspect-ratio`) — that
is what reserves their space, with or without a skeleton over it.

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

It is a plain `<script>`, so a Content Security Policy needs its nonce; the next section
is the whole recipe. Without a CSP, leave the attribute off.

## Content Security Policy

`<Skullet.Boot.boot />` is the one piece of Skullet that needs a nonce: it inlines a
`<script>`, so a policy like `script-src 'self'` blocks it — and with it the skeleton that
was meant to be on screen before the first paint. The engine and the stylesheet are ordinary
assets, served from your own origin.

Make the nonce where the policy is made, keep it for the rest of the request, and hand it to
the script:

```elixir
# lib/my_app_web/plugs/csp.ex
defmodule MyAppWeb.CSP do
  @behaviour Plug
  import Plug.Conn

  @impl true
  def init(opts), do: opts

  @impl true
  def call(conn, _opts) do
    nonce = Base.url_encode64(:crypto.strong_rand_bytes(16), padding: false)

    conn
    |> assign(:csp_nonce, nonce)
    # the LiveView's own render can only read it from the session
    |> put_session(:csp_nonce, nonce)
    |> put_resp_header("content-security-policy", policy(nonce))
  end

  defp policy(nonce) do
    "default-src 'self'; " <>
      "script-src 'self' 'nonce-#{nonce}'; " <>
      "style-src 'self' 'unsafe-inline'; " <>
      "img-src 'self' data:; connect-src 'self'; base-uri 'none'"
  end
end
```

```elixir
# router.ex, in the :browser pipeline, before any LiveView mounts
plug :fetch_session
# …
plug MyAppWeb.CSP
```

```elixir
# the LiveView
def mount(_params, session, socket) do
  {:ok, assign(socket, :csp_nonce, session["csp_nonce"])}
end
```

```heex
<%!-- layouts/root.html.heex, at the end of <body>, after the markup it measures --%>
<Skullet.Boot.boot nonce={@csp_nonce} />
```

Two things that surprise people:

- **The nonce has to reach the LiveView, not just the request.** The root layout is rendered
  twice — once for the HTML the request sends, once by the LiveView after it connects — and
  the second render has only socket assigns. The session is the one place both see, which is
  why the plug writes it there. Skip that and the attribute is simply dropped on the second
  render; the script has already run by then, but the markup no longer tells the truth.
- **The theme is inline styles.** `theme={…}` and `<Skullet.provider theme={…}>` become
  `style` attributes on the wrapper, and the engine positions every bar through the CSSOM.
  Keep `style-src` compatible with that — `'unsafe-inline'` is the easy way; a class of your
  own is the strict one.

Any other inline script of yours (a theme bootstrap, an analytics stub) needs the same
nonce; the demo's `<script nonce={@csp_nonce}>` in `example/` is one.

## Debugging

Add `?skullet-debug` to the URL to outline every skeleton: blue while it loads, then green
if the content arrived where the skeleton was, red with the distance in the title if it
moved. `skullet-debug` on any one element does the same for that subtree, and
`skullet-xray` on an ancestor shows the sample through the skeleton.

## Plain pages

The engine does not need LiveView. Importing `priv/static/skullet.js` on a page with the
component's markup gives you `attach(root)`, which starts the engine on that element, and
`setDebug(on)`:

```js
import { attach, setDebug } from "../../deps/skullet/priv/static/skullet.js"

attach(document.querySelector(".skullet"))
```

No build step at all? Copy `priv/static/skullet.min.js` and `priv/static/skullet.css`
where your static files live and load them directly — the script leaves the same engine on
`window.Skullet`:

```html
<link rel="stylesheet" href="/assets/skullet.css">
<script src="/assets/skullet.min.js"></script>
<script>
  Skullet.attach(document.querySelector(".skullet"))
</script>
```
