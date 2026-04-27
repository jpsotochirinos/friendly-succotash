import { apiClient } from './client';

export type LegalProcessTemplateRow = {
  id: string;
  name: string;
  slug: string;
  legalProcessCode?: string | null;
  applicableLaw?: string | null;
};

export type LegalProcessTimelineResponse =
  | { hasProcess: false }
  | {
      hasProcess: true;
      workflow: {
        id: string;
        name: string;
        slug: string;
        legalProcessCode?: string | null;
        applicableLaw?: string | null;
      };
      currentStateId: string | null;
      stages: Array<{
        id: string;
        key: string;
        name: string;
        stageOrderIndex?: number | null;
        deadlineType: string;
        deadlineDays?: number | null;
        deadlineCalendarType: string;
        deadlineLawRef?: string | null;
        category: string;
        status: string;
      }>;
      deadlines: Array<{
        id: string;
        dueDate: string;
        status: string;
        workflowStateId: string;
        lawRef?: string | null;
      }>;
      logs: Array<{
        id: string;
        advancedAt: string;
        advancedBy: string;
        fromStateId: string | null;
        toStateId: string;
      }>;
    };

export async function listLegalProcessTemplates(): Promise<LegalProcessTemplateRow[]> {
  const { data } = await apiClient.get<LegalProcessTemplateRow[]>('/legal/process/templates');
  return data;
}

export async function initializeLegalProcess(trackableId: string, workflowDefinitionId: string) {
  const { data } = await apiClient.post('/legal/process/initialize', {
    trackableId,
    workflowDefinitionId,
  });
  return data;
}

export async function registerNotificationDate(payload: {
  trackableId: string;
  workflowStateId: string;
  notificationDate: string;
}) {
  const { data } = await apiClient.post('/legal/process/deadlines/register-notification', payload);
  return data;
}

export async function advanceStage(payload: {
  trackableId: string;
  targetStateId: string;
  force?: boolean;
}) {
  const { data } = await apiClient.post('/legal/process/advance', payload);
  return data;
}

export async function getLegalProcessTimeline(
  trackableId: string,
): Promise<LegalProcessTimelineResponse> {
  const { data } = await apiClient.get<LegalProcessTimelineResponse>(
    `/legal/process/trackables/${trackableId}/timeline`,
  );
  return data;
}

export async function getUpcomingLegalDeadlines(days: number = 7) {
  const { data } = await apiClient.get(`/legal/process/deadlines/upcoming`, {
    params: { days },
  });
  return data;
}
