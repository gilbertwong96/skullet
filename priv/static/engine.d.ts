export declare function stateOf(root: Element): string;
export declare class SkulletEngine {
    readonly root: HTMLElement;
    private readonly content;
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
    private reveal;
    private stop;
    private hideOverlay;
    private release;
    private createOverlay;
    private observe;
    private clearHold;
    private clearSafety;
    private schedule;
    private draw;
}
