/**
 * Map ActivityInstance payloads from GET /process-tracks/:id to WorkflowItem-like rows for Expediente (sidebar, resumen).
 */
export type PtWorkflowItemFlags = {
  isProcessTrackActivity: true;
  processTrackId: string;
  stageInstanceId: string;
};

type AssignedUser = {
  id?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  avatarUrl?: string | null;
};

type RawActivity = {
  id: string;
  title: string;
  kind?: string | null;
  actionType?: string | null;
  description?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  itemNumber?: number | null;
  isLegalDeadline?: boolean;
  isMandatory?: boolean;
  isReverted?: boolean;
  workflowStateCategory?: string | null;
  priority?: 'low' | 'normal' | 'high' | 'urgent' | null;
  location?: string | null;
  allDay?: boolean;
  reminderMinutesBefore?: number[] | null;
  rrule?: string | null;
  accentColor?: string | null;
  metadata?: Record<string, unknown> | null;
  assignedTo?: AssignedUser | null;
  parent?: { id: string } | null;
  workflow?: { id: string; name?: string; slug?: string } | null;
  currentState?: { id: string; key?: string; name?: string } | null;
  secondaryAssignees?: AssignedUser[];
};

function workflowCategoryToDisplayStatus(category: string | null | undefined): string {
  const c = (category || '').toLowerCase();
  if (c === 'done') return 'closed';
  if (c === 'in_progress' || c === 'in_review') return 'in_progress';
  if (c === 'cancelled') return 'skipped';
  return 'pending';
}

export function mapActivityToExpedienteRow(
  a: RawActivity,
  processTrackId: string,
  stageInstanceId: string,
  processPrefix: string,
): Record<string, unknown> & PtWorkflowItemFlags {
  const n = a.itemNumber;
  const ticketKey = n != null ? `${processPrefix || 'P'}-${n}` : undefined;
  return {
    id: a.id,
    title: a.title,
    kind: a.kind,
    status: workflowCategoryToDisplayStatus(a.workflowStateCategory),
    stateCategory: a.workflowStateCategory ?? null,
    workflowId: a.workflow?.id ?? null,
    currentStateId: a.currentState?.id ?? null,
    stateKey: a.currentState?.key ?? null,
    ticketKey: ticketKey ?? null,
    itemNumber: a.itemNumber ?? null,
    description: a.description ?? undefined,
    startDate: a.startDate,
    dueDate: a.dueDate,
    assignedTo: a.assignedTo,
    actionType: a.actionType ?? undefined,
    isLegalDeadline: a.isLegalDeadline,
    parentId: a.parent?.id ?? null,
    accentColor: a.accentColor,
    priority: a.priority,
    location: a.location,
    allDay: a.allDay,
    reminderMinutesBefore: a.reminderMinutesBefore,
    rrule: a.rrule,
    metadata: a.metadata ? { ...a.metadata } : {},
    children: [] as never[],
    isProcessTrackActivity: true,
    processTrackId,
    stageInstanceId,
  };
}

/**
 * Flattens all activities from GET /process-tracks (nested stageInstances.activities) into one list.
 */
export function flattenProcessTrackToWorkflowItems(
  processTrackId: string,
  processPrefix: string,
  track: {
    stageInstances?: Array<{
      id: string;
      activities?: RawActivity[] | null;
    }> | null;
  },
): Array<Record<string, unknown> & PtWorkflowItemFlags> {
  const stages = (track.stageInstances ?? []).slice().sort((a, b) => {
    const ao = (a as { order?: number }).order ?? 0;
    const bo = (b as { order?: number }).order ?? 0;
    return ao - bo;
  });
  const out: Array<Record<string, unknown> & PtWorkflowItemFlags> = [];
  for (const st of stages) {
    const acts = st.activities ?? [];
    for (const a of acts) {
      if (!a?.id) continue;
      out.push(mapActivityToExpedienteRow(a, processTrackId, st.id, processPrefix));
    }
  }
  return out;
}
