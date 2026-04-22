export type SelectionDebugLogLevel = 'off' | 'error' | 'warn' | 'info' | 'verbose';
export type SelectionDebugConfig = {
    logLevel: SelectionDebugLogLevel;
    hud: boolean;
    dumpRects: boolean;
    disableRectDedupe: boolean;
};
export type SelectionDebugHudState = {
    docEpoch: number;
    layoutEpoch: number;
    selection: {
        from: number;
        to: number;
    } | null;
    lastPointer: {
        clientX: number;
        clientY: number;
        x: number;
        y: number;
    } | null;
    lastHit: {
        source: 'dom' | 'geometry' | 'margin' | 'none';
        pos: number | null;
        layoutEpoch: number | null;
        mappedPos: number | null;
    } | null;
};
type SuperdocDebugRoot = {
    selection?: Partial<SelectionDebugConfig>;
};
declare global {
    interface Window {
        superdocDebug?: SuperdocDebugRoot;
    }
}
export declare function getSelectionDebugConfig(): SelectionDebugConfig;
export declare function debugLog(level: Exclude<SelectionDebugLogLevel, 'off'>, message: string, data?: Record<string, unknown>): void;
export declare function updateSelectionDebugHud(host: HTMLElement, state: SelectionDebugHudState): void;
export {};
//# sourceMappingURL=SelectionDebug.d.ts.map