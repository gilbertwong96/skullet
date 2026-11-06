/** Of the font size: wider than a space, so one line of text stays one bar. */
export const LINE_GAP = 0.4;
const TOPS = ["ascender", "cap-height", "x-height"];
const BOTTOMS = ["baseline", "descender"];
const TEXT_TOP = "ascender";
const TEXT_BOTTOM = "descender";
const SKIP = new Set(["script", "style", "template", "noscript"]);
/** Measuring gets most markup right; these are for the places it does not. */
const HINT_BLOCK = "skullet-block";
const HINT_IGNORE = "skullet-ignore";
/** Drawn as one block at their box — there is no text inside to measure. */
const MEDIA = new Set([
    "audio",
    "canvas",
    "embed",
    "iframe",
    "img",
    "input",
    "object",
    "picture",
    "select",
    "svg",
    "textarea",
    "video"
]);
const BORDER_SIDES = ["Top", "Right", "Bottom", "Left"];
/**
 * Lays out nothing: reads what the browser already laid out, in coordinates
 * relative to `originEl`.
 */
export function measure(contentEl, originEl) {
    const origin = originEl.getBoundingClientRect();
    const range = document.createRange();
    const candidates = [];
    const blocks = [];
    const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    const styles = new Map();
    let skipped = null;
    let node = walker.nextNode();
    while (node) {
        if (skipped && skipped.contains(node)) {
            node = walker.nextNode();
            continue;
        }
        if (node.nodeType === Node.TEXT_NODE) {
            const parent = node.parentElement;
            if (parent && node.textContent?.trim()) {
                const box = parent.getBoundingClientRect();
                if (box.width > 2 || box.height > 2) {
                    range.selectNodeContents(node);
                    const rects = [...range.getClientRects()]
                        .filter(rect => rect.width > 0 && rect.height > 0)
                        .map(rect => relative(rect, origin));
                    if (rects.length > 0)
                        candidates.push(...toLines(rects, parent, styles));
                }
            }
        }
        else {
            const element = node;
            if (element.hasAttribute(HINT_IGNORE)) {
                skipped = element;
            }
            else if (element.hasAttribute(HINT_BLOCK)) {
                blocks.push(toRect(element.getBoundingClientRect(), origin));
                skipped = element;
            }
            else if (SKIP.has(element.localName)) {
                skipped = element;
            }
            else if (isSkeleton(element)) {
                blocks.push(toRect(element.getBoundingClientRect(), origin));
                skipped = element;
            }
            else if (MEDIA.has(element.localName) || isPainted(element, styles)) {
                blocks.push(toRect(element.getBoundingClientRect(), origin));
            }
        }
        node = walker.nextNode();
    }
    return { lines: mergeLines(candidates), blocks };
}
/**
 * One bar per line box: fragments of the same line, across inline markup and across
 * text nodes, become one, keeping the type of the fragment that starts the line.
 */
export function mergeLines(candidates) {
    const lines = [];
    for (const candidate of [...candidates].sort((a, b) => a.y - b.y || a.x - b.x)) {
        const last = lines[lines.length - 1];
        if (last && sharesLine(last, candidate, Math.min(last.fontSize, candidate.fontSize) * LINE_GAP)) {
            const left = Math.min(last.x, candidate.x);
            const right = Math.max(last.x + last.width, candidate.x + candidate.width);
            const top = Math.min(last.y, candidate.y);
            const bottom = Math.max(last.y + last.height, candidate.y + candidate.height);
            last.x = left;
            last.y = top;
            last.width = right - left;
            last.height = bottom - top;
        }
        else {
            lines.push({ ...candidate });
        }
    }
    return lines;
}
function sharesLine(a, b, gap) {
    const overlap = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
    if (overlap < Math.min(a.height, b.height) / 2)
        return false;
    const distance = Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width);
    return distance <= gap;
}
function toLines(rects, parent, styles) {
    const style = styleOf(parent, styles);
    const fontSize = Number.parseFloat(style.fontSize) || 16;
    const font = [style.fontStyle, style.fontWeight, style.fontSize, style.fontFamily].join(" ");
    const textTop = oneOf(style.getPropertyValue("--skullet-text-top").trim(), TOPS, TEXT_TOP);
    const textBottom = oneOf(style.getPropertyValue("--skullet-text-bottom").trim(), BOTTOMS, TEXT_BOTTOM);
    return rects.map(rect => ({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        font,
        fontSize,
        textTop,
        textBottom
    }));
}
function oneOf(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
}
function isSkeleton(element) {
    return element.getAttribute("phx-hook") === "Skullet" || element.classList.contains("skullet");
}
/** One computed style per element per pass: the getter, not the read, is the cost. */
function styleOf(element, styles) {
    const cached = styles.get(element);
    if (cached)
        return cached;
    const style = getComputedStyle(element);
    styles.set(element, style);
    return style;
}
function isPainted(element, styles) {
    const style = styleOf(element, styles);
    const background = style.backgroundColor;
    const painted = background !== "" && background !== "transparent" && !/[,/]\s*0\)$/.test(background);
    return (painted ||
        (style.backgroundImage !== "" && style.backgroundImage !== "none") ||
        (style.boxShadow !== "" && style.boxShadow !== "none") ||
        BORDER_SIDES.every(side => style.getPropertyValue(`border-${side.toLowerCase()}-style`) !== "none" &&
            style.getPropertyValue(`border-${side.toLowerCase()}-width`) !== "0px"));
}
function relative(rect, origin) {
    return {
        left: rect.left - origin.left,
        top: rect.top - origin.top,
        width: rect.width,
        height: rect.height
    };
}
function toRect(rect, origin) {
    return {
        x: rect.left - origin.left,
        y: rect.top - origin.top,
        width: rect.width,
        height: rect.height
    };
}
