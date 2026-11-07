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
