const registered = new Map();
/**
 * Names a reveal spec, so a skeleton can ask for it by name: `data-skullet-reveal="mine"`,
 * or `attach(root, { reveal: "mine" })`. Names are page-wide, so register once at start-up.
 */
export function registerReveal(name, spec) {
    registered.set(name, spec);
}
export function registeredReveal(name) {
    return registered.get(name);
}
