import { type RevealSpec } from "./plan.js";
/** Turns the overlay on or off for the whole page, from a console or a devtool. */
export declare function setDebug(on: boolean): void;
export declare function stateOf(root: Element): string;
export type EngineOptions = {
    reveal?: RevealSpec;
};
export declare class SkulletEngine {
    readonly root: HTMLElement;
    private readonly override?;
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
    /** performance.now() when the bars first showed; 0 when they never did. */
    private shownAt;
    /** ms since the first reveal of the batch this one joins. */
    private late;
    /** The skeleton was drawn from the data already on screen. */
    private refetched;
    constructor(root: Element, options?: EngineOptions);
    start(): void;
    /** Runs before LiveView patches the content in: the last moment the old shape exists. */
    beforeUpdate(): void;
    /** Runs after the patch: reveal what arrived, or start over. */
    update(): void;
    destroy(): void;
    private get instant();
    /** ms a skeleton waits before showing: a spec's `hold` wins over `--skullet-hold`. */
    private hold;
    private show;
    private showBars;
    /** Phase lives in the shadow root: LiveView patches the light DOM, not this. */
    private setPhase;
    private reveal;
    private stop;
    /** Off is a phase, not an animation: the shadow's transition fades it, and the bars are
     * cleared a beat later — unless a new cycle has already taken the container over. */
    /**
     * Images arrive after the data does. One that has not decoded yet would pop in, so it
     * waits at zero opacity and fades in when it is ready (or after the timeout, if it never
     * is). The pane's own box is what reserves the space, so nothing moves either way.
     */
    private revealImages;
    /** The spec this skeleton asks for — its `reveal` attribute, or `smart`. */
    private spec;
    /** The plan for this reveal, decided the moment the content lands. */
    private plan;
    private runPlan;
    /** `sequence`: pieces arrive in `order`, the bars they replace leave on the same beat. */
    private runSequence;
    /**
     * A wipe of your own: the pane's mask is drawn each frame from `wipe.mask`, and the
     * skeleton's from `wipe.out` — or crossfaded out when you leave that off. Too big a
     * reveal falls back to that crossfade: a front across it would be mostly off screen.
     */
    private wipeOut;
    /** `sweep`: a wipe uncovers the content behind the skeleton's front. */
    private sweepOut;
    /** Debug: did the reveal move the page? Red with the distance, green when it didn't. */
    private markMovement;
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
