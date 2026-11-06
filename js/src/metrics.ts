import type { TextLine, TextTop } from "./measure.js"

type Metrics = {
  /** The font's own box, above and below the baseline. */
  ascent: number
  descent: number
  ascender: number
  capHeight: number
  xHeight: number
  descender: number
}

let context: CanvasRenderingContext2D | null | undefined
const byFont = new Map<string, Metrics | null>()

/** Canvas has the type's metrics; without it, bars are centred in the line instead. */
function textContext(): CanvasRenderingContext2D | null {
  if (context === undefined) {
    const canvas = typeof document === "undefined" ? null : document.createElement("canvas")
    context = canvas ? canvas.getContext("2d") : null
  }

  return context
}

function metricsOf(font: string): Metrics | null {
  if (byFont.has(font)) return byFont.get(font) ?? null

  const canvas = textContext()
  let metrics: Metrics | null = null

  if (canvas) {
    canvas.font = font
    const box = canvas.measureText("H")
    const ink = (text: string) => canvas.measureText(text).actualBoundingBoxAscent

    metrics = {
      ascent: box.fontBoundingBoxAscent,
      descent: box.fontBoundingBoxDescent,
      ascender: ink("bdfhkl"),
      capHeight: box.actualBoundingBoxAscent,
      xHeight: ink("xz"),
      descender: canvas.measureText("gjpqy").actualBoundingBoxDescent
    }
  }

  byFont.set(font, metrics)
  return metrics
}

function inkAbove(rule: TextTop, metrics: Metrics): number {
  if (rule === "cap-height") return metrics.capHeight
  if (rule === "x-height") return metrics.xHeight
  return metrics.ascender
}

/** Where a line's bar goes: from the font lines the theme names, within the line's box. */
export function barBox(line: TextLine): { y: number; height: number } {
  const metrics = metricsOf(line.font)

  if (!metrics) {
    const height = Math.min(line.fontSize * 0.72, line.height)
    return { y: line.y + (line.height - height) / 2, height }
  }

  const box = metrics.ascent + metrics.descent
  const baseline = line.y + (line.height - box) / 2 + metrics.ascent
  const top = baseline - inkAbove(line.textTop, metrics)
  const bottom = baseline + (line.textBottom === "descender" ? metrics.descender : 0)

  return { y: top, height: Math.max(bottom - top, 1) }
}

export function resetFontCache(): void {
  byFont.clear()
  context = undefined
}
