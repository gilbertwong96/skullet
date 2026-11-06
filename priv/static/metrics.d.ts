import type { TextLine } from "./measure.js";
/** Where a line's bar goes: from the font lines the theme names, within the line's box. */
export declare function barBox(line: TextLine): {
    y: number;
    height: number;
};
export declare function resetFontCache(): void;
