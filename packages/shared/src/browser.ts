/**
 * Browser-safe entry for `@tracker/shared`.
 *
 * The default entry (`./dist/index.js`) is CommonJS and re-exports modules
 * that depend on Node built-ins (`crypto`, `fs`, `path`) and Node-only
 * packages (`nspell`, `dictionary-es`). Serving the CJS bundle directly
 * to the browser triggers `ReferenceError: exports is not defined`, and
 * transitively pulling the Node-only deps breaks Vite's pre-bundling.
 *
 * This file exposes only the pure, platform-agnostic pieces the web app
 * actually needs (enums, types, constants, state machines, rules, events,
 * notification constants/types). Keep this list free of modules that import
 * Node built-ins or server-only libraries.
 */
export * from './enums/index';
export * from './types/index';
export * from './constants/index';
export {
  type Transition,
  TrackableStateMachine,
  WorkflowItemStateMachine,
  DocumentReviewStateMachine,
  trackableTransitions,
  workflowItemTransitions,
  documentReviewTransitions,
  getTrackableTransitions,
  getWorkflowItemTransitions,
  getDocumentReviewTransitions,
  validateTrackableTransition,
  validateWorkflowItemTransition,
  validateDocumentReviewTransition,
} from './state-machine/index';
export * from './notifications/constants';
export * from './notifications/types';
export * from './events/index';
export * from './rules/index';
export * from './workflow/resolve';
export * from './process-track/stage-work';
