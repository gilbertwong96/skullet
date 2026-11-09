# Reveals

A reveal is the moment content replaces its skeleton. `reveal` on the skeleton (or on a
provider, or a spec handed to `attach/2`) says how it looks. The timings are custom
properties — see [theming](theming.md).

## Modes

`together` is the crossfade without the wait. `sequence` takes the bars out one after
another, top to bottom. `sweep` wipes the skeleton away over the content, which is already
in place. `instant` shows and removes the skeleton with no transition.

`smart` (the default) decides at the moment the content lands, from how the page is being
used and what arrived:

- **instant** if the skeleton was up for less than `--skullet-hold` (150 ms), or somebody
  scrolled, touched or typed in the last 400 ms — a skeleton then is a flicker, not a cue;
- **a quick crossfade** (120 ms) when a second cycle refetches something whose shape is
  already known;
- **one crossfade** over `--skullet-fade` (200 ms) for a small reveal — under 72px tall, or
  three pieces or fewer;
- **a cascade** down the page for anything bigger: rows arrive whole, in page order, on
  screen only, main text first and small text `--skullet-secondary-delay` behind its
  heading, spread over `--skullet-cascade` (320 ms), with reveals landing together sharing
  one order.

Every piece can start from a filter or a scale (`--skullet-enter-filter`,
`--skullet-enter-scale`), and `--skullet-delay` holds the whole reveal back a beat.

Either way it eases to the content's real height over `--skullet-resize` (280 ms) if the
sample guessed it wrong.

A `hold` that is not shorter than how long the data actually takes leaves nothing to see —
no skeleton, and no reveal to animate. That is the same threshold `smart` reads, so raising
`--skullet-hold` past your latency turns every reveal instant.

## Bring your own reveal

`smart`, `together`, `sequence`, `sweep` and `instant` are just specs; register one and ask
for it by name:

```js
import { registerReveal } from "../../deps/skullet/priv/static/skullet.js"

registerReveal("wipe-down", {
  duration: 400,
  wipe: {
    mask: progress => `linear-gradient(#000 ${progress * 100}%, transparent)`
  }
})
```

```heex
<Skullet.skeleton id="profile" async={@user} sample={@sample} reveal="wipe-down">
```

A spec can say more than a name can:

| field | what it does |
|---|---|
| `order` | `"together"`, or `(piece, settings) => ms` — `piece` carries its `rect`, its `unit` (the row or card it belongs to), whether it is `secondary` (smaller text), the `reveal` box and how `late` it landed; `settings` carries `cascade` and `secondaryDelay` |
| `enter` | a `Keyframe` each piece starts from, on top of the fade: `{ filter: "blur(6px)", transform: "scale(0.98)" }` |
| `wipe` | `{ mask(progress, pane) → string, out? }`: your own front, drawn each frame as the pane's `mask-image`; `out` masks the skeleton too, otherwise it crossfades |
| `delay`, `duration`, `hold` | ms; `duration: 0` is instant, `hold` replaces `--skullet-hold` |
| `choose` | `(context) => spec`, called as the content lands with `waited`, `input`, `refetch`, `hold`, `height` and `pieces` — what it returns wins |

On a plain page you can skip the registry and hand the spec straight to the engine:
`attach(root, { reveal: spec })`. A wipe bigger than a screen and a half falls back to a
crossfade, and everything is instant under `prefers-reduced-motion`.

The types are on `skullet.d.ts` in the package: `RevealSpec`, `RevealContext`, `Piece`,
`Wipe` and the rest.
