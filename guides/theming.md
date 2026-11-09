# Theming

Everything is a CSS custom property, so one skeleton can differ from the page:

| variable | default | what |
|---|---|---|
| `--skullet-base` | `rgb(128 128 128 / 0.2)` | the bars |
| `--skullet-highlight` | `rgb(255 255 255 / 0.12)` | the shimmer's band |
| `--skullet-radius` | `0.25em` | how round each bar is |
| `--skullet-hold` | `150ms` | how long a skeleton waits before showing, so fast data never shows one |
| `--skullet-fade` | `200ms` | the crossfade at the reveal |
| `--skullet-resize` | `280ms` | the height ease when the real content is a different size |
| `--skullet-cascade` | `320ms` | how long a `sequence` — or `smart`'s cascade — takes from first piece to last |
| `--skullet-delay` | `0ms` | a pause before the reveal starts |
| `--skullet-secondary-delay` | `60ms` | how long small text trails the heading it sits under |
| `--skullet-enter-filter` | `none` | where pieces come from: e.g. `blur(6px)` |
| `--skullet-enter-scale` | `1` | where pieces come from: e.g. `0.98` |
| `--skullet-animation` | `shimmer` | `shimmer`, `group-shimmer`, `pulse` or `none` |
| `--skullet-speed` | `slow` | `slow` or `fast` |
| `--skullet-text-top` | `ascender` | `ascender`, `cap-height` or `x-height` — where each line's bar starts |
| `--skullet-text-bottom` | `descender` | `baseline` or `descender` — where it ends |

```heex
<Skullet.skeleton id="profile" sample={@sample_user} theme={%{speed: "fast", radius: "8px"}}>
  …
</Skullet.skeleton>
```

Every row above is also a `theme` key — the name without the prefix, so
`theme={%{hold: "300ms", delay: "120ms", enter_filter: "blur(6px)"}}` sets those three for
this skeleton alone, and `<Skullet.provider theme={…}>` sets them for everything inside.

Colours follow the page's `color-scheme`, so a light page on a dark desktop keeps light
bars. Under `prefers-reduced-motion` bars hold still and every reveal is instant.

## One place for the look

Everything inside a provider inherits its look, so you set it once:

```heex
<Skullet.provider mode="dark" animation="group-shimmer" speed="fast" theme={%{radius: "6px"}}>
  <.page />
</Skullet.provider>
```

`theme`, `animation` and `speed` become the custom properties the skeletons inside inherit;
a skeleton's own `theme` still wins.

## Mode

`mode` sets `color-scheme` on the wrapper, and that is the palette the bars are drawn from
— not the page's. It is how one subtree asks for the other scheme: a dark panel on a light
page wants dark bars, so it wraps them in `<Skullet.provider mode="dark">`. Leave it unset
and the bars follow whatever `color-scheme` the page sets, which is what a theme toggle
does.

Both palettes are low-alpha fills meant for their own background — light bars on a light
page are `rgb(128 128 128 / 0.2)`, dark ones are `rgb(255 255 255 / 0.09)`. Forcing the
wrong one onto a surface makes the bars nearly invisible, so match `mode` to what is behind
the skeleton.

## Animation

`shimmer` gives every bar its own band, all in one phase; `group-shimmer` sweeps a single
band across the whole skeleton, which reads better when the bars are close together. Both
follow the same rule as upstream: the band is capped at 320px, bands are 2.5 band-widths
apart on a 110° slant, and the loop is timed to a 1280px reference width so the pace is the
same on any screen. `pulse` fades the bars in and out, and `none` holds them still.
