import { ActionType } from '../enums/index';

const KEYWORD_RULES: { pattern: RegExp; actionType: ActionType; kind: string }[] = [
  { pattern: /\bdemanda\b/i, actionType: ActionType.FILE_BRIEF, kind: 'Demanda' },
  { pattern: /\bcontestaci[oó]n\b/i, actionType: ActionType.DOC_UPLOAD, kind: 'Contestación' },
  { pattern: /\bresoluci[oó]n\b/i, actionType: ActionType.DOC_UPLOAD, kind: 'Resolución' },
  { pattern: /\bsentencia\b/i, actionType: ActionType.DOC_UPLOAD, kind: 'Sentencia' },
  { pattern: /\baudiencia\b/i, actionType: ActionType.SCHEDULE_HEARING, kind: 'Audiencia' },
  { pattern: /\boficio\b/i, actionType: ActionType.NOTIFY_PARTY, kind: 'Oficio' },
  { pattern: /\brecurso\b/i, actionType: ActionType.FILE_BRIEF, kind: 'Recurso' },
  { pattern: /\bescrito\b/i, actionType: ActionType.FILE_BRIEF, kind: 'Escrito' },
  { pattern: /\bapelaci[oó]n\b/i, actionType: ActionType.FILE_BRIEF, kind: 'Apelación' },
  { pattern: /\bc[eé]dula\b/i, actionType: ActionType.NOTIFY_PARTY, kind: 'Cédula' },
  { pattern: /\bnotificaci[oó]n\b/i, actionType: ActionType.NOTIFY_PARTY, kind: 'Notificación' },
  { pattern: /\bpago\b.*\btasa\b/i, actionType: ActionType.PAY_COURT_FEE, kind: 'Pago de tasa' },
];

export interface RuleClassificationResult {
  actionType: ActionType;
  kind: string;
  confidence: number;
  method: 'rules';
}

/**
 * Clasificación barata por nombre de archivo + snippet de texto.
 */
export function classifyByRules(filename: string, textPreview: string): RuleClassificationResult | null {
  const haystack = `${filename}\n${textPreview}`.slice(0, 50_000);
  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(haystack)) {
      return {
        actionType: rule.actionType,
        kind: rule.kind,
        confidence: 0.72,
        method: 'rules',
      };
    }
  }
  return null;
}
