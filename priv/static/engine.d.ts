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
    constructor(root: Element);
    start(): void;
    beforeUpdate(): void;
    update(): void;
    destroy(): void;
    private observe;
    private schedule;
    private draw;
}
