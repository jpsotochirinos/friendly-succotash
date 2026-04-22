import type { ActionType } from '../enums/index';

export type ImportClassificationMethod = 'rules' | 'embeddings' | 'llm';

export interface ImportClassification {
  actionType?: ActionType;
  kind?: string;
  confidence?: number;
  method?: ImportClassificationMethod;
  reasoning?: string;
  suggestedWorkflowItemTitle?: string;
}
