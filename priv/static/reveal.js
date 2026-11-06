/** Reduced motion is honoured everywhere: no shimmer, and an instant reveal. */
export function prefersReducedMotion() {
    return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
