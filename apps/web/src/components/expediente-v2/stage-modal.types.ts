export type ActivityType =
  | 'Fase'
  | 'Diligencia'
  | 'Obligatoria'
  | 'Audiencia'
  | 'Crítica'
  | 'Trámite'
  | 'Informe';

export type ActivityPriorityUi = 'Alta' | 'Media' | 'Baja';

export type ActivityStatusUi = 'Pendiente' | 'En progreso' | 'Hecha';

export interface StageActivityDraft {
  tempId: string;
  serverId?: string;
  name: string;
  type?: ActivityType;
  priority: ActivityPriorityUi;
  assigneeId?: string;
  dueInDays?: number;
  status: ActivityStatusUi;
}

export interface StageDocument {
  id: string;
  name: string;
  sizeKB: number;
  uploadedBy: string;
  /** ISO date YYYY-MM-DD */
  uploadedAt: string;
  /** Set when the user picked a file; removed after server upload. */
  file?: File;
}

export interface StageComment {
  id: string;
  author: string;
  text: string;
  at: string;
}

export interface StageDraft {
  id?: string;
  name: string;
  color: string;
  responsibleId?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  activities: StageActivityDraft[];
  documents: StageDocument[];
  comments: StageComment[];
}

export const ALEGA_STAGE_WIZARD_PALETTE = [
  '#2D3FBF',
  '#7C4DB8',
  '#C85A9B',
  '#E8A33D',
  '#3FB58C',
  '#1B2080',
  '#8A92C7',
  '#0D0F2B',
] as const;

export function emptyStageDraft(): StageDraft {
  return {
    name: '',
    color: ALEGA_STAGE_WIZARD_PALETTE[0]!,
    activities: [],
    documents: [],
    comments: [],
  };
}

export interface StageUserOption {
  id: string;
  initials: string;
  name: string;
  color: string;
}
