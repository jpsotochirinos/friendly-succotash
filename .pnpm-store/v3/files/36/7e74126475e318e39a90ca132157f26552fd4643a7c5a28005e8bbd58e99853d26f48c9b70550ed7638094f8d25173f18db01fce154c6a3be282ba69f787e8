import { Node as PMNode, Mark } from 'prosemirror-model';
import { EditorState, Transaction } from 'prosemirror-state';
/** Result of computing the change range between two strings */
export interface ChangeRange {
    /** Number of characters matching at the start */
    prefix: number;
    /** Number of characters matching at the end */
    suffix: number;
    /** Whether there's any difference between the strings */
    hasChange: boolean;
}
/** Options for the applyPatch function */
export interface ApplyPatchOptions {
    /** ProseMirror editor state */
    state: EditorState;
    /** ProseMirror transaction to apply changes to */
    tr: Transaction;
    /** Start position of the range to patch */
    from: number;
    /** End position of the range to patch */
    to: number;
    /** The suggested replacement text */
    suggestedText: string;
}
/** Result of applying a patch */
export interface ApplyPatchResult {
    /** The transaction (modified if changed) */
    tr: Transaction;
    /** Whether any change was made */
    changed: boolean;
}
export declare const _testInternals: {
    computeChangeRange: (original: string, suggested: string) => ChangeRange;
    resolveInlineTextPosition: (doc: PMNode, position: number, direction: "forward" | "backward") => number;
    mapCharOffsetToPosition: (doc: PMNode, from: number, to: number, charOffset: number) => number;
    getFirstTextMarks: (doc: PMNode, from: number, to: number) => readonly Mark[] | null;
    getMarksAtPosition: (state: EditorState, position: number) => Mark[];
    buildTextNodes: (state: EditorState, from: number, to: number, suggestedText: string) => PMNode[];
};
/**
 * Applies a text patch to a ProseMirror document, computing the minimal change needed.
 *
 * This function is designed for AI-generated text suggestions and programmatic edits.
 * It finds the minimal diff between original and suggested text, then applies only
 * the changed portion to the document while preserving formatting.
 *
 * Key features:
 * - Minimal diff: Only the changed portion is replaced, not the entire range
 * - Format preservation: Replacement text inherits formatting from selection start
 * - Safe: Returns unchanged if inputs are invalid or text is identical
 *
 * @example
 * // Replace "quick" with "fast" in "The quick brown fox"
 * const { tr, changed } = applyPatch({
 *   state: editorState,
 *   tr: editorState.tr,
 *   from: 0,
 *   to: 19,
 *   suggestedText: "The fast brown fox"
 * });
 * // Only "quick" → "fast" is replaced, not the entire string
 */
export declare const applyPatch: ({ state, tr, from, to, suggestedText }: ApplyPatchOptions) => ApplyPatchResult;
//# sourceMappingURL=applyPatch.d.ts.map