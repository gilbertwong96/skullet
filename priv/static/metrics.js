let context;
const byFont = new Map();
/** Canvas has the type's metrics; without it, bars are centred in the line instead. */
function textContext() {
    if (context === undefined) {
        const canvas = typeof document === "undefined" ? null : document.createElement("canvas");
        context = canvas ? canvas.getContext("2d") : null;
    }
    return context;
}
function metricsOf(font) {
    if (byFont.has(font))
        return byFont.get(font) ?? null;
    const canvas = textContext();
    let metrics = null;
    if (canvas) {
        canvas.font = font;
        const box = canvas.measureText("H");
        const ink = (text) => canvas.measureText(text).actualBoundingBoxAscent;
        metrics = {
            ascent: box.fontBoundingBoxAscent,
            descent: box.fontBoundingBoxDescent,
            ascender: ink("bdfhkl"),
            capHeight: box.actualBoundingBoxAscent,
            xHeight: ink("xz"),
            descender: canvas.measureText("gjpqy").actualBoundingBoxDescent
        };
    }
    byFont.set(font, metrics);
    return metrics;
}
function inkAbove(rule, metrics) {
    if (rule === "cap-height")
        return metrics.capHeight;
    if (rule === "x-height")
        return metrics.xHeight;
    return metrics.ascender;
}
/** Where a line's bar goes: from the font lines the theme names, within the line's box. */
export function barBox(line) {
    const metrics = metricsOf(line.font);
    if (!metrics) {
        const height = Math.min(line.fontSize * 0.72, line.height);
        return { y: line.y + (line.height - height) / 2, height };
    }
    const box = metrics.ascent + metrics.descent;
    const baseline = line.y + (line.height - box) / 2 + metrics.ascent;
    const top = baseline - inkAbove(line.textTop, metrics);
    const bottom = baseline + (line.textBottom === "descender" ? metrics.descender : 0);
    return { y: top, height: Math.max(bottom - top, 1) };
}
export function resetFontCache() {
    byFont.clear();
    context = undefined;
}
