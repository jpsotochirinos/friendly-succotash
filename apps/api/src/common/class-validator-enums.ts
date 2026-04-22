/**
 * Listas literales para @IsIn — evita @IsEnum(Enum) cuando el enum de @tracker/shared
 * aún no está inicializado (barrel / orden de carga) y class-validator recibe `undefined`.
 */
export const MATTER_TYPE_VALUES = [
  'litigation',
  'corporate',
  'labor',
  'family',
  'tax',
  'criminal',
  'administrative',
  'advisory',
  'real_estate',
  'other',
] as const;

export const ACTION_TYPE_VALUES = [
  'doc_creation',
  'doc_upload',
  'approval',
  'data_entry',
  'external_check',
  'notification',
  'generic',
  'file_brief',
  'schedule_hearing',
  'pay_court_fee',
  'notify_party',
] as const;
