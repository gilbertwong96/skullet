export type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
};
export type TextTop = "ascender" | "cap-height" | "x-height";
export type TextBottom = "baseline" | "descender";
export type TextLine = Rect & {
    font: string;
    fontSize: number;
    textTop: TextTop;
    textBottom: TextBottom;
};
/** Of the font size: wider than a space, so one line of text stays one bar. */
export declare const LINE_GAP = 0.4;
/**
 * Lays out nothing: reads what the browser already laid out, in coordinates
 * relative to `originEl`.
 */
export declare function measure(contentEl: Element, originEl: Element): {
    lines: TextLine[];
    blocks: Rect[];
};
/**
 * One bar per line box: fragments of the same line, across inline markup and across
 * text nodes, become one, keeping the type of the fragment that starts the line.
 */
export declare function mergeLines<T extends TextLine>(candidates: T[]): T[];
