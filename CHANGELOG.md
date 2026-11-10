# Changelog

## 0.1.0 (unreleased)

First release.

- `<Skullet.skeleton>`: renders your component from sample data while an async assign or
  plain data is missing, and draws a measured skeleton of what is coming.
- Theme through CSS custom properties: base and highlight colours, radius, animation
  (`shimmer` / `group-shimmer` / `pulse` / `none`), speed, and how much of each line is
  drawn (`--skullet-text-top` / `--skullet-text-bottom`).
- `smart` (hold, then crossfade) and `instant` reveals; height eases when the sample and
  the real content differ.
- Measuring hints: `skullet-block` and `skullet-ignore`.
- Optional server-side memory: `remember={scope}` draws the next skeleton from the data
  the last one showed, in ETS, expiring after `:memory_ttl_ms`.
- `<Skullet.Boot.boot />`: draws the skeleton before the browser's first paint, sharing the
  engine's geometry; optional CSP nonce.
- Reveals: `smart`, `together`, `sequence`, `instant`. Timings are custom properties
  (`--skullet-hold`, `--skullet-fade`, `--skullet-resize`).
- `<Skullet.box>` for what cannot be measured; `?skullet-debug` overlay; `skullet-xray`.
- `skeleton` slot for per-component skeletons (and the Suspense shape: async + measured
  fallback + error branch).
- `<Skullet.provider>` for `mode`, `theme`, `animation` and `speed` in one place.
- `registerReveal/2` and `attach(root, {reveal})`: your own reveal spec, with `order`,
  `enter`, `wipe`, `delay`, `duration`, `hold` and `choose`.
- Custom properties for the reveal itself: `--skullet-cascade`, `--skullet-delay`,
  `--skullet-secondary-delay`, `--skullet-enter-filter`, `--skullet-enter-scale`.
- `sweep` reveal, and `smart` now decides between instant, a quick refetch crossfade, one
  crossfade and a page cascade, from how long the skeleton was up, recent input, refetches
  and the size of what arrives.
- Images that decode after the reveal fade in instead of popping (ten-second timeout).
- Empty states: `empty` with an `empty_message` slot shows a message in place of content
  that arrived empty, measured and revealed like any other content.
- The light-mode highlight is `rgb(255 255 255 / 0.75)`, not `0.12`: a white band at 12%
  over `rgb(128 128 128 / 0.2)` bars is a 12/255 difference, invisible next to the dark
  theme's, so light pages looked like they had no shimmer at all.
- `theme`, `mode`, `animation` and `speed` are emitted as a `<style>` block keyed by the
  element's id instead of a `style` attribute, and a `<Skullet.box>` is a class and a rule,
  so a Content Security Policy needs no `'unsafe-inline'` for styles. Pass `nonce={…}`.
- `priv/static` ships bundles rather than one file per module: `skullet.js` (ESM),
  `skullet.min.js` (a script defining `window.Skullet`, with its source map), the inlined
  `skullet.pre.js` and one hand-written `skullet.d.ts`.
- Every documented custom property is a `theme` key, including the reveal's `hold`, `fade`,
  `resize`, `cascade`, `delay`, `secondary_delay`, `enter_filter` and `enter_scale`.
