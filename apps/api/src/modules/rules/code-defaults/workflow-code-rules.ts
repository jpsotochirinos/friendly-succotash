import {
  ActionType,
  DomainEvents,
  WorkflowItemStatus,
  type WorkflowRuleDefinition,
} from '@tracker/shared';

/**
 * Default ECA rules by action type. Org DB rules can override via higher priority.
 *
 * Los `WorkflowItemStatus` en `action.to` deben coincidir con `WorkflowState.key` del workflow
 * asignado a la actividad (p. ej. flujos sembrados en `workflows.seed.ts`). El contexto de reglas
 * expone también `item.currentStateKey` y `item.workflowId` para condiciones más finas.
 */
export const WORKFLOW_CODE_RULES: WorkflowRuleDefinition[] = [
  // --- DOC_CREATION ---
  {
    id: 'code:doc_creation:activate_on_document',
    name: 'DOC_CREATION: activate when document exists',
    event: DomainEvents.DOCUMENT_CREATED,
    actionTypes: [ActionType.DOC_CREATION],
    condition: {
      all: [
        { eq: ['item.actionType', ActionType.DOC_CREATION] },
        { eq: ['item.currentStateKey', WorkflowItemStatus.PENDING] },
      ],
    },
    action: { type: 'transition', to: WorkflowItemStatus.ACTIVE },
    priority: 10,
  },
  {
    id: 'code:doc_creation:in_progress_on_edit',
    name: 'DOC_CREATION: in progress when document edited',
    event: DomainEvents.DOCUMENT_UPDATED,
    actionTypes: [ActionType.DOC_CREATION],
    condition: {
      all: [
        { eq: ['item.actionType', ActionType.DOC_CREATION] },
        { eq: ['item.currentStateKey', WorkflowItemStatus.ACTIVE] },
        { gt: ['payload.contentLengthDelta', 0] },
      ],
    },
    action: { type: 'transition', to: WorkflowItemStatus.IN_PROGRESS },
    priority: 10,
  },
  {
    id: 'code:doc_creation:submit_review',
    name: 'DOC_CREATION: submit for review',
    event: DomainEvents.DOCUMENT_SUBMITTED,
    actionTypes: [ActionType.DOC_CREATION],
    condition: {
      all: [
        { eq: ['item.actionType', ActionType.DOC_CREATION] },
        {
          any: [
            { eq: ['item.currentStateKey', WorkflowItemStatus.IN_PROGRESS] },
            { eq: ['item.currentStateKey', WorkflowItemStatus.ACTIVE] },
          ],
        },
      ],
    },
    action: { type: 'transition', to: WorkflowItemStatus.UNDER_REVIEW },
    priority: 10,
  },

  // --- DOC_UPLOAD ---
  {
    id: 'code:doc_upload:activate_on_document',
    name: 'DOC_UPLOAD: activate when document uploaded',
    event: DomainEvents.DOCUMENT_CREATED,
    actionTypes: [ActionType.DOC_UPLOAD],
    condition: {
      all: [
        { eq: ['item.actionType', ActionType.DOC_UPLOAD] },
        { eq: ['item.currentStateKey', WorkflowItemStatus.PENDING] },
      ],
    },
    action: { type: 'transition', to: WorkflowItemStatus.ACTIVE },
    priority: 10,
  },
  {
    id: 'code:doc_upload:activate_on_upload_version',
    name: 'DOC_UPLOAD: activate on new version upload',
    event: DomainEvents.DOCUMENT_UPLOADED,
    actionTypes: [ActionType.DOC_UPLOAD],
    condition: {
      all: [
        { eq: ['item.actionType', ActionType.DOC_UPLOAD] },
        { eq: ['item.currentStateKey', WorkflowItemStatus.PENDING] },
      ],
    },
    action: { type: 'transition', to: WorkflowItemStatus.ACTIVE },
    priority: 10,
  },
  {
    id: 'code:doc_upload:in_progress_on_edit',
    name: 'DOC_UPLOAD: in progress on content change',
    event: DomainEvents.DOCUMENT_UPDATED,
    actionTypes: [ActionType.DOC_UPLOAD],
    condition: {
      all: [
        { eq: ['item.actionType', ActionType.DOC_UPLOAD] },
        { eq: ['item.currentStateKey', WorkflowItemStatus.ACTIVE] },
        { gt: ['payload.contentLengthDelta', 0] },
      ],
    },
    action: { type: 'transition', to: WorkflowItemStatus.IN_PROGRESS },
    priority: 10,
  },
  {
    id: 'code:doc_upload:submit_review',
    name: 'DOC_UPLOAD: submit for review',
    event: DomainEvents.DOCUMENT_SUBMITTED,
    actionTypes: [ActionType.DOC_UPLOAD],
    condition: {
      all: [
        { eq: ['item.actionType', ActionType.DOC_UPLOAD] },
        {
          any: [
            { eq: ['item.currentStateKey', WorkflowItemStatus.IN_PROGRESS] },
            { eq: ['item.currentStateKey', WorkflowItemStatus.ACTIVE] },
          ],
        },
      ],
    },
    action: { type: 'transition', to: WorkflowItemStatus.UNDER_REVIEW },
    priority: 10,
  },

  // --- APPROVAL ---
  {
    id: 'code:approval:activate_on_document',
    name: 'APPROVAL: activate when document linked',
    event: DomainEvents.DOCUMENT_CREATED,
    actionTypes: [ActionType.APPROVAL],
    condition: {
      all: [
        { eq: ['item.actionType', ActionType.APPROVAL] },
        { eq: ['item.currentStateKey', WorkflowItemStatus.PENDING] },
      ],
    },
    action: { type: 'transition', to: WorkflowItemStatus.ACTIVE },
    priority: 10,
  },
  {
    id: 'code:approval:in_progress_on_edit',
    name: 'APPROVAL: in progress on edit',
    event: DomainEvents.DOCUMENT_UPDATED,
    actionTypes: [ActionType.APPROVAL],
    condition: {
      all: [
        { eq: ['item.actionType', ActionType.APPROVAL] },
        { eq: ['item.currentStateKey', WorkflowItemStatus.ACTIVE] },
        { gt: ['payload.contentLengthDelta', 0] },
      ],
    },
    action: { type: 'transition', to: WorkflowItemStatus.IN_PROGRESS },
    priority: 10,
  },
  {
    id: 'code:approval:submit_review',
    name: 'APPROVAL: submit for review',
    event: DomainEvents.DOCUMENT_SUBMITTED,
    actionTypes: [ActionType.APPROVAL],
    condition: {
      all: [
        { eq: ['item.actionType', ActionType.APPROVAL] },
        {
          any: [
            { eq: ['item.currentStateKey', WorkflowItemStatus.IN_PROGRESS] },
            { eq: ['item.currentStateKey', WorkflowItemStatus.ACTIVE] },
          ],
        },
      ],
    },
    action: { type: 'transition', to: WorkflowItemStatus.UNDER_REVIEW },
    priority: 10,
  },
];
