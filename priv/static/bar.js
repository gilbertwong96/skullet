export function createBar(rect) {
    const bar = document.createElement("span");
    bar.setAttribute("data-skullet-bar", "");
    bar.style.cssText = `width:${rect.width}px;height:${rect.height}px;transform:translate(${rect.x}px,${rect.y}px)`;
    return bar;
}
