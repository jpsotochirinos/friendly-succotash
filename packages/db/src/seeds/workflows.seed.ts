import type { EntityManager } from '@mikro-orm/core';
import {
  WorkflowDefinition,
  WorkflowState,
  WorkflowTransition,
} from '../entities';
import { ActionType, WorkflowItemStatus, WorkflowStateCategory, systemWorkflowSlugForActionType } from '@tracker/shared';

type StateDef = {
  key: WorkflowItemStatus;
  name: string;
  category: WorkflowStateCategory;
  sortOrder: number;
  isInitial?: boolean;
};

export const STANDARD_STATES: StateDef[] = [
  {
    key: WorkflowItemStatus.PENDING,
    name: 'Pendiente',
    category: WorkflowStateCategory.TODO,
    sortOrder: 0,
    isInitial: true,
  },
  {
    key: WorkflowItemStatus.ACTIVE,
    name: 'Activo',
    category: WorkflowStateCategory.TODO,
    sortOrder: 1,
  },
  {
    key: WorkflowItemStatus.IN_PROGRESS,
    name: 'En curso',
    category: WorkflowStateCategory.IN_PROGRESS,
    sortOrder: 2,
  },
  {
    key: WorkflowItemStatus.UNDER_REVIEW,
    name: 'En revisión',
    category: WorkflowStateCategory.IN_REVIEW,
    sortOrder: 3,
  },
  {
    key: WorkflowItemStatus.VALIDATED,
    name: 'Validado',
    category: WorkflowStateCategory.DONE,
    sortOrder: 4,
  },
  {
    key: WorkflowItemStatus.REJECTED,
    name: 'Rechazado',
    category: WorkflowStateCategory.CANCELLED,
    sortOrder: 5,
  },
  {
    key: WorkflowItemStatus.CLOSED,
    name: 'Cerrado',
    category: WorkflowStateCategory.DONE,
    sortOrder: 6,
  },
  {
    key: WorkflowItemStatus.SKIPPED,
    name: 'Omitido',
    category: WorkflowStateCategory.CANCELLED,
    sortOrder: 7,
  },
];

/** Transiciones equivalentes a WorkflowItemStateMachine en shared. */
const STANDARD_TRANSITIONS: Array<{
  from: WorkflowItemStatus;
  to: WorkflowItemStatus;
  name: string;
  requiredPermission?: string;
}> = [
  { from: WorkflowItemStatus.PENDING, to: WorkflowItemStatus.ACTIVE, name: 'Activate', requiredPermission: 'workflow:update' },
  { from: WorkflowItemStatus.ACTIVE, to: WorkflowItemStatus.IN_PROGRESS, name: 'Start', requiredPermission: 'workflow:update' },
  { from: WorkflowItemStatus.ACTIVE, to: WorkflowItemStatus.UNDER_REVIEW, name: 'Submit for review', requiredPermission: 'workflow:update' },
  { from: WorkflowItemStatus.IN_PROGRESS, to: WorkflowItemStatus.UNDER_REVIEW, name: 'Submit for review', requiredPermission: 'workflow:update' },
  { from: WorkflowItemStatus.UNDER_REVIEW, to: WorkflowItemStatus.VALIDATED, name: 'Validate', requiredPermission: 'workflow:review' },
  { from: WorkflowItemStatus.UNDER_REVIEW, to: WorkflowItemStatus.REJECTED, name: 'Reject', requiredPermission: 'workflow:review' },
  { from: WorkflowItemStatus.VALIDATED, to: WorkflowItemStatus.CLOSED, name: 'Close', requiredPermission: 'workflow:update' },
  { from: WorkflowItemStatus.REJECTED, to: WorkflowItemStatus.IN_PROGRESS, name: 'Rework', requiredPermission: 'workflow:update' },
  { from: WorkflowItemStatus.PENDING, to: WorkflowItemStatus.SKIPPED, name: 'Skip', requiredPermission: 'workflow:update' },
  { from: WorkflowItemStatus.ACTIVE, to: WorkflowItemStatus.SKIPPED, name: 'Skip', requiredPermission: 'workflow:update' },
];

const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  [ActionType.DOC_CREATION]: 'Creación de documento',
  [ActionType.DOC_UPLOAD]: 'Carga de documento',
  [ActionType.APPROVAL]: 'Aprobación',
  [ActionType.DATA_ENTRY]: 'Captura de datos',
  [ActionType.EXTERNAL_CHECK]: 'Verificación externa',
  [ActionType.NOTIFICATION]: 'Notificación',
  [ActionType.GENERIC]: 'Genérico',
  [ActionType.FILE_BRIEF]: 'Presentación de escrito',
  [ActionType.SCHEDULE_HEARING]: 'Programar audiencia',
  [ActionType.PAY_COURT_FEE]: 'Pago de tasa',
  [ActionType.NOTIFY_PARTY]: 'Notificar parte',
};

async function ensureWorkflow(
  em: EntityManager,
  slug: string,
  displayName: string,
  description: string,
  opts?: {
    actionType?: ActionType;
    appliesToAllTypes?: boolean;
    isDefault?: boolean;
  },
): Promise<WorkflowDefinition> {
  let wf = await em.findOne(WorkflowDefinition, {
    slug,
    isSystem: true,
    organization: null,
  });
  if (wf) {
    return wf;
  }

  const now = new Date();
  wf = em.create(WorkflowDefinition, {
    slug,
    name: displayName,
    description,
    isSystem: true,
    isDefault: opts?.isDefault ?? false,
    jurisdiction: 'PE',
    actionType: opts?.actionType,
    appliesToAllTypes: opts?.appliesToAllTypes ?? false,
    createdAt: now,
    updatedAt: now,
  });

  const stateByKey = new Map<WorkflowItemStatus, WorkflowState>();

  for (const s of STANDARD_STATES) {
    const st = em.create(WorkflowState, {
      workflow: wf,
      key: s.key,
      name: s.name,
      category: s.category,
      sortOrder: s.sortOrder,
      isInitial: !!s.isInitial,
      createdAt: now,
      updatedAt: now,
    });
    stateByKey.set(s.key, st);
  }

  for (const t of STANDARD_TRANSITIONS) {
    const fromSt = stateByKey.get(t.from)!;
    const toSt = stateByKey.get(t.to)!;
    em.create(WorkflowTransition, {
      workflow: wf,
      fromState: fromSt,
      toState: toSt,
      name: t.name,
      requiredPermission: t.requiredPermission,
      createdAt: now,
      updatedAt: now,
    });
  }

  await em.flush();
  return wf;
}

/**
 * Flujo de demostración: mismos estados que el estándar despacho, pero con transición entre
 * cualquier par de estados distintos y sin `requiredPermission` (solo demo — no usar en producción).
 * Idempotente: si el slug ya existe, no hace nada.
 */
export async function seedDemoFreeWorkflow(em: EntityManager): Promise<void> {
  const slug = 'demo-free';
  const existing = await em.findOne(WorkflowDefinition, {
    slug,
    isSystem: true,
    organization: null,
  });
  if (existing) {
    return;
  }

  const now = new Date();
  const wf = em.create(WorkflowDefinition, {
    slug,
    name: 'Demo libre',
    description:
      'Demo only — fully connected transitions without permission gates; do not use in production.',
    isSystem: true,
    isDefault: false,
    jurisdiction: 'PE',
    appliesToAllTypes: true,
    createdAt: now,
    updatedAt: now,
  });

  const stateByKey = new Map<WorkflowItemStatus, WorkflowState>();

  for (const s of STANDARD_STATES) {
    const st = em.create(WorkflowState, {
      workflow: wf,
      key: s.key,
      name: s.name,
      category: s.category,
      sortOrder: s.sortOrder,
      isInitial: !!s.isInitial,
      createdAt: now,
      updatedAt: now,
    });
    stateByKey.set(s.key, st);
  }

  const keys = [...stateByKey.keys()];
  for (const from of keys) {
    for (const to of keys) {
      if (from === to) continue;
      em.create(WorkflowTransition, {
        workflow: wf,
        fromState: stateByKey.get(from)!,
        toState: stateByKey.get(to)!,
        name: `${from}→${to}`,
        requiredPermission: undefined,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  await em.flush();
}

/** Idempotente: crea workflows sistema estándar si no existen. */
export async function seedSystemWorkflows(em: EntityManager): Promise<void> {
  await ensureWorkflow(
    em,
    'standard-judicial-pe',
    'Estándar judicial (PE)',
    'Flujo por defecto alineado al estado de actuaciones legacy (judicial).',
    { appliesToAllTypes: true, isDefault: true },
  );
  await ensureWorkflow(
    em,
    'standard-office',
    'Estándar despacho',
    'Flujo por defecto alineado al estado de actuaciones legacy (despacho).',
    { appliesToAllTypes: true, isDefault: true },
  );

  const actionTypes = Object.values(ActionType) as ActionType[];
  for (const at of actionTypes) {
    const slug = systemWorkflowSlugForActionType(at);
    const label = ACTION_TYPE_LABELS[at] ?? at;
    await ensureWorkflow(
      em,
      slug,
      `Actuación · ${label}`,
      `Flujo por defecto del sistema para actividades tipo ${at}.`,
      { actionType: at, appliesToAllTypes: false, isDefault: false },
    );
  }

  await seedDemoFreeWorkflow(em);
}
