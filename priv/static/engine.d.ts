export declare function stateOf(root: Element): string;
export declare class SkulletEngine {
    readonly root: HTMLElement;
    private content;
    private overlay;
    private bars;
    private frame;
    private started;
    private resizes;
    private mutations;
    private state;
    private phase;
    private pass;
    private pinned;
    private holdTimer;
    private safetyTimer;
    private easing;
    constructor(root: Element);
    start(): void;
    /** Runs before LiveView patches the content in: the last moment the old shape exists. */
    beforeUpdate(): void;
    /** Runs after the patch: reveal what arrived, or start over. */
    update(): void;
    destroy(): void;
    private get instant();
    private show;
    private showBars;
    /** Phase lives in the shadow root: LiveView patches the light DOM, not this. */
    private setPhase;
    private reveal;
    private stop;
    /** Off is a phase, not an animation: the shadow's transition fades it, and the bars are
     * cleared a beat later — unless a new cycle has already taken the container over. */
    private hideOverlay;
    private release;
    /**
     * The overlay is server-rendered: LiveView prunes children it does not know about, so
     * an overlay the engine created itself would vanish on the first patch. A plain page
     * may still leave it out; then one is made here.
     */
    /**
     * LiveView reuses nodes positionally: after a structural change the node the engine
     * holds can be a different element, or detached entirely. Both are looked up again by
     * selector before every use, so the engine never measures or draws into a node that is
     * no longer the content pane or the overlay.
     */
    private resolve;
    private createOverlay;
    private observe;
    private clearHold;
    private clearSafety;
    private schedule;
    private draw;
}
