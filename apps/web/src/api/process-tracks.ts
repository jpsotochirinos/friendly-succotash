import { apiClient } from './client';

export async function createProcessTrack(body: { trackableId: string; systemBlueprintId?: string }) {
  const { data } = await apiClient.post('/process-tracks', body);
  return data;
}

export async function getProcessTrack(id: string) {
  const { data } = await apiClient.get(`/process-tracks/${id}`);
  return data;
}

export async function createProcessTrackStage(
  processTrackId: string,
  body?: { stageTemplateCode?: string },
) {
  const { data } = await apiClient.post(`/process-tracks/${processTrackId}/stages`, body ?? {});
  return data as { id: string; order: number; stageTemplateCode: string; status: string };
}

export async function patchProcessTrackMeta(
  processTrackId: string,
  body: {
    icon?: string;
    iconColor?: string;
    label?: string;
    metadata?: Record<string, unknown> | null;
  },
) {
  const { data } = await apiClient.patch(`/process-tracks/${processTrackId}/meta`, body);
  return data;
}

export async function getProcessTrackResolved(id: string) {
  const { data } = await apiClient.get(`/process-tracks/${id}/resolved`);
  return data;
}

export async function listProcessTrackEvents(id: string) {
  const { data } = await apiClient.get(`/process-tracks/${id}/events`);
  return data;
}

export async function listDeadlines(id: string) {
  const { data } = await apiClient.get(`/process-tracks/${id}/deadlines`);
  return data;
}

export async function enterStage(processTrackId: string, stageInstanceId: string) {
  const { data } = await apiClient.post(
    `/process-tracks/${processTrackId}/stages/${stageInstanceId}/enter`,
  );
  return data;
}

export async function getStageProgress(processTrackId: string, stageInstanceId: string) {
  const { data } = await apiClient.get(
    `/process-tracks/${processTrackId}/stages/${stageInstanceId}/progress`,
  );
  return data;
}

export async function advanceStage(
  processTrackId: string,
  stageInstanceId: string,
  body?: { pendingActions?: Array<{ activityId: string; action: 'inherit' | 'close' }> },
) {
  const { data } = await apiClient.post(
    `/process-tracks/${processTrackId}/stages/${stageInstanceId}/advance`,
    body ?? {},
  );
  return data;
}

export async function reopenStage(
  processTrackId: string,
  stageInstanceId: string,
  body: { reason: string },
) {
  const { data } = await apiClient.post(
    `/process-tracks/${processTrackId}/stages/${stageInstanceId}/reopen`,
    body,
  );
  return data;
}

export async function closeStageWork(processTrackId: string, stageInstanceId: string) {
  const { data } = await apiClient.post(
    `/process-tracks/${processTrackId}/stages/${stageInstanceId}/close-work`,
  );
  return data;
}

export async function reopenStageWork(processTrackId: string, stageInstanceId: string) {
  const { data } = await apiClient.post(
    `/process-tracks/${processTrackId}/stages/${stageInstanceId}/reopen-work`,
  );
  return data;
}

export type CreateProcessTrackActivityBody = {
  stageInstanceId?: string;
  title: string;
  description?: string;
  isMandatory?: boolean;
  dueDate?: string | null;
  startDate?: string | null;
  kind?: string;
  actionType?: string;
  assignedToId?: string | null;
  reviewedById?: string | null;
  parentId?: string | null;
  location?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent' | string;
  allDay?: boolean;
  reminderMinutesBefore?: number[] | null;
  rrule?: string | null;
  isLegalDeadline?: boolean;
  accentColor?: string | null;
  calendarColor?: string | null;
  metadata?: Record<string, unknown> | null;
  secondaryAssigneeIds?: string[];
  workflowId?: string | null;
  currentStateId?: string | null;
  documentTemplateId?: string | null;
  workflowStateCategory?: string;
};

export type PatchProcessTrackActivityBody = Partial<{
  title: string;
  description: string | null;
  dueDate: string | null;
  startDate: string | null;
  workflowStateCategory: string;
  stageInstanceId: string;
  isMandatory: boolean;
  kind: string;
  actionType: string;
  assignedToId: string | null;
  reviewedById: string | null;
  parentId: string | null;
  location: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent' | string;
  allDay: boolean;
  reminderMinutesBefore: number[] | null;
  rrule: string | null;
  isLegalDeadline: boolean;
  accentColor: string | null;
  calendarColor: string | null;
  metadata: Record<string, unknown> | null;
  secondaryAssigneeIds: string[];
  workflowId: string | null;
  currentStateId: string | null;
  documentTemplateId: string | null;
}>;

export async function createCustomActivity(
  processTrackId: string,
  body: CreateProcessTrackActivityBody,
) {
  const { data } = await apiClient.post(`/process-tracks/${processTrackId}/activities`, body);
  return data;
}

export async function completeActivity(processTrackId: string, activityId: string) {
  const { data } = await apiClient.post(
    `/process-tracks/${processTrackId}/activities/${activityId}/complete`,
  );
  return data;
}

export async function patchProcessTrackActivity(
  processTrackId: string,
  activityId: string,
  body: PatchProcessTrackActivityBody,
) {
  const { data } = await apiClient.patch(
    `/process-tracks/${processTrackId}/activities/${activityId}`,
    body,
  );
  return data;
}

export async function moveActivity(
  processTrackId: string,
  activityId: string,
  stageInstanceId: string,
) {
  return patchProcessTrackActivity(processTrackId, activityId, { stageInstanceId });
}

export async function deleteProcessTrackActivity(processTrackId: string, activityId: string) {
  await apiClient.delete(`/process-tracks/${processTrackId}/activities/${activityId}`);
}

export async function patchStageInstanceMeta(
  processTrackId: string,
  stageInstanceId: string,
  body: {
    label?: string;
    stageColor?: string;
    responsibleUserId?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  const { data } = await apiClient.patch(
    `/process-tracks/${processTrackId}/stages/${stageInstanceId}/meta`,
    body,
  );
  return data;
}

export async function overrideDeadline(
  processTrackId: string,
  deadlineId: string,
  body: { effectiveDate: string; reason: string },
) {
  const { data } = await apiClient.patch(
    `/process-tracks/${processTrackId}/deadlines/${deadlineId}/override`,
    body,
  );
  return data;
}
