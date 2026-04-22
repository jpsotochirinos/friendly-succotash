export type PendingInteractiveChoiceOption = {
  id: string;
  title: string;
  description?: string;
};

export type PendingInteractiveChoice = {
  kind: 'choice';
  toolCallId: string;
  page: number;
  pageSize: number;
  allOptions: PendingInteractiveChoiceOption[];
};

export type PendingInteractiveConfirm = {
  kind: 'confirm';
  toolCallId: string;
  toolName: string;
  argsSummary: string;
  /** `mutation`: needs_confirmation del asistente; `widget`: ui_ask_confirm. */
  source: 'mutation' | 'widget';
};

export type PendingInteractive = PendingInteractiveChoice | PendingInteractiveConfirm;

export function isPendingInteractive(v: unknown): v is PendingInteractive {
  if (!v || typeof v !== 'object') return false;
  const k = (v as { kind?: string }).kind;
  return k === 'choice' || k === 'confirm';
}
