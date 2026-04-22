export declare class PresentationInputBridge {
    #private;
    /**
     * Creates a new PresentationInputBridge that forwards user input events from the visible layout
     * surface to the hidden editor DOM. This enables input handling when the actual editor is not
     * directly visible to the user.
     *
     * @param windowRoot - The window object containing the layout surface and editor target
     * @param layoutSurface - The visible HTML element that receives user input events (e.g., keyboard, mouse)
     * @param getTargetDom - Callback that returns the hidden editor's DOM element where events should be forwarded
     * @param isEditable - Callback that returns whether the editor is in an editable mode (editing/suggesting).
     *                     When this returns false (e.g., in viewing mode), keyboard, text, and composition
     *                     events will not be forwarded to prevent document modification.
     * @param onTargetChanged - Optional callback invoked when the target editor DOM element changes
     * @param options - Optional configuration including:
     *                  - useWindowFallback: Whether to attach window-level event listeners as fallback
     */
    constructor(windowRoot: Window, layoutSurface: HTMLElement, getTargetDom: () => HTMLElement | null, isEditable: () => boolean, onTargetChanged?: (target: HTMLElement | null) => void, options?: {
        useWindowFallback?: boolean;
    });
    bind(): void;
    destroy(): void;
    notifyTargetChanged(): void;
}
//# sourceMappingURL=PresentationInputBridge.d.ts.map