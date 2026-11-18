# Changelog

## Unreleased

## 0.2.0 - 2026-11-17

### Breaking changes

- `Skullet.state/1` raises on a state it does not know, instead of handing back the atom.
- A theme value that could close its rule — `{`, `}`, `;`, `<`, `>` — is rejected: the value
  is one declaration, and `<style>` is not an attribute. A value that carries one now fails
  to render instead of injecting what follows it.
- `data-skullet-sample` is a bare attribute, present only while the pane holds a sample; it
  used to render `data-skullet-sample="false"` over real content. A rule that matched the
  old value stops matching.

### Added

- `skullet:reveal`, a bubbling DOM event dispatched as content replaces its skeleton, for
  the work that has to happen then — moving focus, closing a menu, announcing a region.
- `createSkeletonBox/1`, the `<Skullet.box>` equivalent for a page with no server to render
  it: the same `skullet-block` span, sized through the CSSOM.

### Changed

- Served with `Boot.boot(src: …)`, the pre-paint script starts itself: no inline call and no
  nonce, so a strict `script-src 'self'` policy can paint the skeleton before first paint.
- The pre-paint script publishes the resolved durations too, so a placeholder of your own
  reads the page's speed before the engine starts.

### Fixed

- The sample is hidden from screen readers while it loads (`aria-hidden`), so the label is
  what gets read rather than fabricated data.
- A skeleton nested in a loading one now starts drawing when the outer one reveals, instead
  of waiting for a patch of its own — and no longer keeps the bars the pre-paint script drew
  for it: the script skips it, and the engine clears anything left.
- `attach/2` returns the engine already running on that root instead of starting a second
  one over the same overlay; a destroyed root can be attached again.
- A failed skeleton with no `:error` slot warns instead of rendering an empty pane, like
  `empty` without `:empty_message` already did.
- `Boot.boot(src:)` no longer throws when the script did not load: the call is guarded.
- An overlay is looked up among its own skeleton's children, so a nested skeleton cannot
  lend its overlay to its parent.
- `state: :empty` no longer writes its sample into memory as if it were the last real data.
- Expired memory is pruned: on read, and by a sweep every minute, so a key nobody reads
  again does not keep its row for the node's lifetime.
- The misuse warnings are said once per reason rather than once per skeleton id: ids are
  unbounded, and every `:persistent_term.put/2` is a global update.

## 0.1.2 - 2026-11-11

### Added

- `--skullet-shimmer-duration` and `--skullet-pulse-duration`, published on `<html>` as the
  engine draws, so a placeholder of your own can run on the same clock instead of copying
  the numbers from the source.

### Changed

- The guide shows `Boot.boot(src:)` served straight out of the dependency with
  `Plug.Static from: {:skullet, "priv/static"}`, and what the inline versus fetched script
  actually costs.

## 0.1.1 - 2026-11-11

### Added

- `state` on `Skullet.skeleton` — `:loading`, `:loaded`, `:failed` or `:empty` — for the two
  states an assign cannot express: loaded and empty, and a failure that did not come from an
  async assign.
- `Skullet.state/1`, the same decision for your own helpers, so "nil means loading" lives in
  one place.
- `class` and any other attribute (`role`, `data-*`) pass through to the skeleton's root, so
  a layout rhythm no longer needs a wrapper inside the content.
- `Skullet.Boot.boot(src: …)` fetches the pre-paint script as a blocking `<script src>`
  instead of inlining it.

### Changed

- The no-JS fallback marks the pane it reveals with `data-skullet-sample="true"`, and
  `--skullet-nojs-reveal: none` keeps it hidden where the sample is not safe to show.

### Fixed

- A skeleton nested inside another loading skeleton no longer draws a second overlay over
  the same pixels.
- Turning the OS's reduced-motion setting on or off while the page is open now stops or
  starts the bars; it was read once, at creation.
- `sample: nil`, and `empty` without an `:empty_message` slot, warn once per skeleton
  instead of rendering something that quietly does nothing.

## 0.1.0 - 2026-11-10

### Added

- `<Skullet.skeleton>` draws a skeleton of the component itself: your markup is rendered
  from a sample with its text transparent, measured by the browser, and covered with bars —
  one per wrapped line, one block per image or control. It takes an `assign_async/3` result,
  plain data, or a `loading` flag.
- Slots for the states around loading: `skeleton` for your own markup to measure (the
  Suspense shape, together with `error`), `empty_message` with the `empty` attribute for a
  result that arrived empty, and `error` for a failed assign. The library styles none of
  them.
- `remember` keeps the data a skeleton last showed, in ETS on the node, so the next
  skeleton under the same scope and id is drawn from the real thing instead of the sample.
  `Skullet.Memory.forget/1` clears one scope, `Skullet.Memory.clear/0` clears all of them,
  and entries expire after `config :skullet, :memory_ttl_ms`.
- Theming through custom properties — base and highlight colours, radius,
  `shimmer` / `group-shimmer` / `pulse` / `none`, speed, hold, and how much of each line is
  drawn — set per skeleton with `theme={…}` or once with `<Skullet.provider>`, which also
  sets `mode`, `animation` and `speed` for everything inside it.
- Reveals: `smart` (instant for a flash, a quick crossfade for a refetch, one crossfade for
  small content, a page cascade otherwise), plus `together`, `sequence`, `sweep` and
  `instant`, with their timings and enter effects as custom properties.
- `registerReveal/2` and `attach(root, {reveal: spec})` take a reveal of your own:
  `order`, `enter`, `wipe`, `delay`, `duration`, `hold` and `choose`.
- `<Skullet.Boot.boot />` draws the skeletons already in the server's HTML before the
  browser's first paint, from the same geometry, font metrics and shimmer the engine uses.
- `<Skullet.box>` stands in for what cannot be measured (a logo, a chart, a canvas);
  `skullet-block` and `skullet-ignore` hint the measurement.
- Images that decode after the content arrives fade in instead of popping, and show after
  ten seconds if they never do.
- A debug overlay outlines every reveal, and how far the content moved, with
  `?skullet-debug` in the URL, `skullet-debug` on an element, or `skullet-xray` to see the
  sample through the skeleton.
- Works under a Content Security Policy without `'unsafe-inline'`: themes and boxes are
  `<style>` blocks signed with the page's nonce, and so is the boot script. Pass
  `nonce={…}` to `skeleton/1`, `provider/1`, `box/1` and `Boot.boot/1`.
- `priv/static` ships an ES module for bundlers (`skullet.js`), the same engine as a script
  for pages without a build step (`skullet.min.js`, which defines `window.Skullet`), the
  inlined pre-paint script, and a hand-written `skullet.d.ts`.

### Compatibility

- Elixir `~> 1.18`, Phoenix LiveView `~> 1.2`, Phoenix.HTML `~> 4.3`.
- Under a Content Security Policy, `script-src` and `style-src` need the nonce; no
  `'unsafe-inline'` is required.
