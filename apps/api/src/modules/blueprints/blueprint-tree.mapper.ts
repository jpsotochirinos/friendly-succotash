import {
  type BlueprintVersion,
  type ActivityTemplate,
  type StageTemplate,
} from '@tracker/db';
import { DeadlineOnExpiry } from '@tracker/shared';
import {
  type BlueprintTreeSnapshot,
  type ActivitySnapshot,
  type DocumentSuggestionSnapshot,
  type StageSnapshot,
} from '@tracker/shared';

/**
 * Map a published `BlueprintVersion` + relations to a plain tree for `applyOverridesToTree`.
 * Caller must have populated `stageTemplates`, `activityTemplates`/`activities`, `documentSuggestions`, `deadlineRules`, `sinoeKeywordRules`.
 */
export function blueprintVersionToSnapshot(version: BlueprintVersion): BlueprintTreeSnapshot {
  const stages: StageSnapshot[] = (version.stageTemplates.getItems() ?? [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((st) => mapStageTemplate(st));

  return {
    versionId: version.id,
    versionNumber: version.versionNumber,
    stages,
    deadlineRules: (version.deadlineRules.getItems() ?? []).map((r) => ({
      code: r.code,
      name: r.name,
      trigger: String(r.trigger),
      triggerTargetCode: r.triggerTargetCode,
      durationDays: r.durationDays,
      durationUnit: r.durationUnit as string,
      legalReference: r.legalReference,
      onExpiry: (r.onExpiry as DeadlineOnExpiry) ?? DeadlineOnExpiry.ALERT_ONLY,
      criticality: r.criticality,
    })),
    sinoeKeywordRules: (version.sinoeKeywordRules.getItems() ?? []).map((r) => ({
      code: r.code,
      pattern: r.pattern,
      matchMode: r.matchMode,
      action: r.action,
      actionTargetCode: r.actionTargetCode,
      confidenceScore: r.confidenceScore,
      requiresApproval: r.requiresApproval,
    })),
  };
}

function mapStageTemplate(st: StageTemplate): StageSnapshot {
  const activities: ActivitySnapshot[] = (st.activities.getItems() ?? [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(
      (a: ActivityTemplate): ActivitySnapshot => ({
        code: a.code,
        name: a.name,
        order: a.order,
        isMandatory: a.isMandatory,
      }),
    );

  const documentSuggestions: DocumentSuggestionSnapshot[] = (st.documentSuggestions.getItems() ?? [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((d) => ({
      code: d.code,
      name: d.name,
      documentType: d.documentType,
      order: d.order,
      isRequired: d.isRequired,
    }));

  return {
    code: st.code,
    name: st.name,
    order: st.order,
    isOptional: st.isOptional,
    activities,
    documentSuggestions,
  };
}
