import {
  BlueprintOverrideOperation,
  BlueprintTargetType,
} from '../enums';

export type ValueOrigin = 'SYSTEM' | 'TENANT' | 'INSTANCE';

export interface Provenance<T> {
  value: T;
  origin: ValueOrigin;
  overrideId?: string;
}

export interface ActivitySnapshot {
  code: string;
  name: string;
  order: number;
  isMandatory: boolean;
}

export interface DocumentSuggestionSnapshot {
  code: string;
  name: string;
  documentType: string;
  order: number;
  isRequired: boolean;
}

export interface StageSnapshot {
  code: string;
  name: string;
  order: number;
  isOptional: boolean;
  activities: ActivitySnapshot[];
  documentSuggestions: DocumentSuggestionSnapshot[];
}

export interface DeadlineRuleSnapshot {
  code: string;
  name: string;
  trigger: string;
  triggerTargetCode?: string;
  durationDays: number;
  durationUnit: string;
  legalReference?: string;
  onExpiry: string;
  criticality: string;
}

export interface SinoeRuleSnapshot {
  code: string;
  pattern: string;
  matchMode: string;
  action: string;
  actionTargetCode?: string;
  confidenceScore: number;
  requiresApproval: boolean;
}

export interface BlueprintTreeSnapshot {
  versionId: string;
  versionNumber: number;
  stages: StageSnapshot[];
  deadlineRules: DeadlineRuleSnapshot[];
  sinoeKeywordRules: SinoeRuleSnapshot[];
}

export interface OverrideRow {
  id: string;
  targetType: BlueprintTargetType;
  targetCode?: string;
  operation: BlueprintOverrideOperation;
  patch: Record<string, unknown>;
}

export interface ResolvedProvenance {
  [key: string]: Provenance<unknown> | Provenance<unknown>[] | Record<string, unknown> | undefined;
}

export interface ResolvedActivityNode extends ActivitySnapshot {
  _meta: { name: Provenance<string> };
}

export interface ResolvedStageNode extends StageSnapshot {
  _meta: {
    name: Provenance<string>;
    order: Provenance<number>;
  };
  activities: Array<ActivitySnapshot & { _p: { name: Provenance<string> } }>;
  documentSuggestions: Array<
    DocumentSuggestionSnapshot & { _p: { name: Provenance<string> } }
  >;
}

export interface ResolvedTree {
  stages: ResolvedStageNode[];
  deadlineRules: Array<
    DeadlineRuleSnapshot & { _p: { name: Provenance<string> } }
  >;
  sinoeKeywordRules: Array<
    SinoeRuleSnapshot & { _p: { pattern: Provenance<string> } }
  >;
  sourceVersionIds: string[];
}

const prov = <T>(value: T, origin: ValueOrigin, overrideId?: string): Provenance<T> => ({
  value,
  origin,
  overrideId,
});

type StageProv = { name: ValueOrigin; order: ValueOrigin };
type ActivityProv = { name: ValueOrigin };
type DsProv = { name: ValueOrigin };
type DlProv = { name: ValueOrigin };
type SrProv = { pattern: ValueOrigin };

class ProvTracker {
  stage = new Map<string, StageProv>();
  activity = new Map<string, ActivityProv>();
  /** doc sugg key: `${stageCode}::${code}` */
  doc = new Map<string, DsProv>();
  deadline = new Map<string, DlProv>();
  sinoe = new Map<string, SrProv>();
}

function initProv(base: BlueprintTreeSnapshot): ProvTracker {
  const t = new ProvTracker();
  for (const s of base.stages) {
    t.stage.set(s.code, { name: 'SYSTEM', order: 'SYSTEM' });
    for (const a of s.activities) {
      t.activity.set(`${s.code}::${a.code}`, { name: 'SYSTEM' });
    }
    for (const d of s.documentSuggestions) {
      t.doc.set(`${s.code}::${d.code}`, { name: 'SYSTEM' });
    }
  }
  for (const r of base.deadlineRules) t.deadline.set(r.code, { name: 'SYSTEM' });
  for (const r of base.sinoeKeywordRules) t.sinoe.set(r.code, { pattern: 'SYSTEM' });
  return t;
}

/** Deep merge snapshot from system → tenant instance chain using typed overrides. */
export function applyOverridesToTree(
  base: BlueprintTreeSnapshot,
  tenantOverrides: OverrideRow[] | undefined,
  instanceOverrides: OverrideRow[] | undefined,
  tenantOrigin: boolean,
): ResolvedTree {
  const sourceVersionIds: string[] = [base.versionId];
  const stages = structuredClone(base.stages) as StageSnapshot[];
  const deadlineRules = structuredClone(base.deadlineRules);
  const sinoeRules = structuredClone(base.sinoeKeywordRules);
  const provTrack = initProv(base);

  const tOverrides = (tenantOrigin ? tenantOverrides : undefined) ?? [];
  const iOverrides = instanceOverrides ?? [];

  const apply = (o: OverrideRow, origin: ValueOrigin) => {
    switch (o.targetType) {
      case BlueprintTargetType.STAGE:
        applyStageOverride(stages, o, origin, provTrack);
        break;
      case BlueprintTargetType.ACTIVITY:
        applyActivityOverride(stages, o, origin, provTrack);
        break;
      case BlueprintTargetType.DOCUMENT_SUGGESTION:
        applyDocSuggestionOverride(stages, o, origin, provTrack);
        break;
      case BlueprintTargetType.DEADLINE_RULE:
        applyDeadlineOverride(deadlineRules, o, origin, provTrack);
        break;
      case BlueprintTargetType.SINOE_RULE:
        applySinoeOverride(sinoeRules, o, origin, provTrack);
        break;
      default:
        break;
    }
  };

  for (const o of tOverrides) apply(o, 'TENANT');
  for (const o of iOverrides) apply(o, 'INSTANCE');

  return {
    ...wrapResolvedWithProvenance(
      { stages, deadlineRules, sinoeKeywordRules: sinoeRules },
      provTrack,
    ),
    sourceVersionIds,
  };
}

function findStage(stages: StageSnapshot[], code: string): StageSnapshot | undefined {
  return stages.find((s) => s.code === code);
}

function applyStageOverride(
  stages: StageSnapshot[],
  o: OverrideRow,
  origin: ValueOrigin,
  p: ProvTracker,
): void {
  if (!o.targetCode) return;
  const st = findStage(stages, o.targetCode);
  if (!st) return;
  if (o.operation === BlueprintOverrideOperation.REMOVE) {
    const idx = stages.findIndex((s) => s.code === o.targetCode);
    if (idx >= 0) stages.splice(idx, 1);
    p.stage.delete(o.targetCode);
    return;
  }
  if (o.operation === BlueprintOverrideOperation.MODIFY) {
    if (o.patch.name !== undefined) p.stage.set(o.targetCode, { ...getStageProv(p, o.targetCode), name: origin });
    if (o.patch.order !== undefined)
      p.stage.set(o.targetCode, { ...getStageProv(p, o.targetCode), order: origin });
    Object.assign(st, o.patch);
  }
  if (o.operation === BlueprintOverrideOperation.ADD) {
    const code = (o.patch.code as string) ?? o.targetCode;
    if (findStage(stages, code)) return;
    stages.push({
      code,
      name: (o.patch.name as string) ?? code,
      order: (o.patch.order as number) ?? stages.length,
      isOptional: Boolean(o.patch.isOptional),
      activities: [],
      documentSuggestions: [],
    });
    p.stage.set(code, { name: origin, order: origin });
  }
}
function getStageProv(p: ProvTracker, code: string): StageProv {
  return p.stage.get(code) ?? { name: 'SYSTEM', order: 'SYSTEM' };
}

function applyActivityOverride(
  stages: StageSnapshot[],
  o: OverrideRow,
  origin: ValueOrigin,
  p: ProvTracker,
): void {
  const stageCode = o.patch.stageCode as string;
  if (!stageCode) return;
  const st = findStage(stages, stageCode);
  if (!st) return;
  const code = o.targetCode ?? (o.patch.code as string);
  if (!code) return;
  const key = `${stageCode}::${code}`;

  if (o.operation === BlueprintOverrideOperation.REMOVE) {
    st.activities = st.activities.filter((a) => a.code !== code);
    p.activity.delete(key);
    return;
  }
  if (o.operation === BlueprintOverrideOperation.MODIFY) {
    const act = st.activities.find((a) => a.code === code);
    if (act) {
      if (o.patch.name !== undefined) p.activity.set(key, { name: origin });
      Object.assign(act, o.patch);
    }
    return;
  }
  if (o.operation === BlueprintOverrideOperation.ADD) {
    st.activities.push({
      code,
      name: (o.patch.name as string) ?? code,
      order: (o.patch.order as number) ?? st.activities.length,
      isMandatory: Boolean(o.patch.isMandatory),
    });
    p.activity.set(key, { name: origin });
  }
}

function applyDocSuggestionOverride(
  stages: StageSnapshot[],
  o: OverrideRow,
  origin: ValueOrigin,
  p: ProvTracker,
): void {
  const stageCode = o.patch.stageCode as string;
  if (!stageCode) return;
  const st = findStage(stages, stageCode);
  if (!st) return;
  const code = o.targetCode ?? (o.patch.code as string);
  if (!code) return;
  const key = `${stageCode}::${code}`;

  if (o.operation === BlueprintOverrideOperation.REMOVE) {
    st.documentSuggestions = st.documentSuggestions.filter((d) => d.code !== code);
    p.doc.delete(key);
    return;
  }
  if (o.operation === BlueprintOverrideOperation.MODIFY) {
    const d = st.documentSuggestions.find((x) => x.code === code);
    if (d) {
      if (o.patch.name !== undefined) p.doc.set(key, { name: origin });
      Object.assign(d, o.patch);
    }
    return;
  }
  if (o.operation === BlueprintOverrideOperation.ADD) {
    st.documentSuggestions.push({
      code,
      name: (o.patch.name as string) ?? code,
      documentType: (o.patch.documentType as string) ?? 'otro',
      order: (o.patch.order as number) ?? 0,
      isRequired: Boolean(o.patch.isRequired),
    });
    p.doc.set(key, { name: origin });
  }
}

function applyDeadlineOverride(rules: DeadlineRuleSnapshot[], o: OverrideRow, origin: ValueOrigin, p: ProvTracker) {
  if (!o.targetCode) return;
  if (o.operation === BlueprintOverrideOperation.REMOVE) {
    const i = rules.findIndex((r) => r.code === o.targetCode);
    if (i >= 0) rules.splice(i, 1);
    p.deadline.delete(o.targetCode);
    return;
  }
  if (o.operation === BlueprintOverrideOperation.MODIFY) {
    const r = rules.find((x) => x.code === o.targetCode);
    if (r) {
      if (o.patch.name !== undefined) p.deadline.set(o.targetCode, { name: origin });
      Object.assign(r, o.patch);
    }
  }
}

function applySinoeOverride(rules: SinoeRuleSnapshot[], o: OverrideRow, origin: ValueOrigin, p: ProvTracker) {
  if (!o.targetCode) return;
  if (o.operation === BlueprintOverrideOperation.REMOVE) {
    const i = rules.findIndex((r) => r.code === o.targetCode);
    if (i >= 0) rules.splice(i, 1);
    p.sinoe.delete(o.targetCode);
    return;
  }
  if (o.operation === BlueprintOverrideOperation.MODIFY) {
    const r = rules.find((x) => x.code === o.targetCode);
    if (r) {
      if (o.patch.pattern !== undefined) p.sinoe.set(o.targetCode, { pattern: origin });
      Object.assign(r, o.patch);
    }
  }
}

function wrapResolvedWithProvenance(
  input: {
    stages: StageSnapshot[];
    deadlineRules: DeadlineRuleSnapshot[];
    sinoeKeywordRules: SinoeRuleSnapshot[];
  },
  p: ProvTracker,
): Omit<ResolvedTree, 'sourceVersionIds'> {
  return {
    stages: input.stages.map((s) => {
      const sp = p.stage.get(s.code) ?? { name: 'SYSTEM' as const, order: 'SYSTEM' as const };
      return {
        ...s,
        _meta: { name: prov(s.name, sp.name), order: prov(s.order, sp.order) },
        activities: s.activities.map((a) => {
          const ap = p.activity.get(`${s.code}::${a.code}`) ?? { name: 'SYSTEM' as const };
          return { ...a, _p: { name: prov(a.name, ap.name) } };
        }),
        documentSuggestions: s.documentSuggestions.map((d) => {
          const dp = p.doc.get(`${s.code}::${d.code}`) ?? { name: 'SYSTEM' as const };
          return { ...d, _p: { name: prov(d.name, dp.name) } };
        }),
      };
    }),
    deadlineRules: input.deadlineRules.map((r) => {
      const rp = p.deadline.get(r.code) ?? { name: 'SYSTEM' as const };
      return { ...r, _p: { name: prov(r.name, rp.name) } };
    }),
    sinoeKeywordRules: input.sinoeKeywordRules.map((r) => {
      const sp = p.sinoe.get(r.code) ?? { pattern: 'SYSTEM' as const };
      return { ...r, _p: { pattern: prov(r.pattern, sp.pattern) } };
    }),
  };
}

/**
 * Strips provenance for JSON snapshot storage (e.g. `blueprint_resolved_snapshots.resolvedTreeJson`).
 */
export function resolvedTreeToJson(tree: ResolvedTree): Record<string, unknown> {
  return JSON.parse(JSON.stringify(tree)) as Record<string, unknown>;
}
