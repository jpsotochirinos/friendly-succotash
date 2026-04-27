import { describe, it, expect } from 'vitest';
import {
  applyOverridesToTree,
  type BlueprintTreeSnapshot,
  type OverrideRow,
} from './resolve-tree';
import {
  BlueprintOverrideOperation,
  BlueprintTargetType,
} from '../enums';

const base: BlueprintTreeSnapshot = {
  versionId: 'v-sys-1',
  versionNumber: 1,
  stages: [
    {
      code: 'demanda',
      name: 'Demanda',
      order: 1,
      isOptional: false,
      activities: [{ code: 'a1', name: 'Redactar', order: 1, isMandatory: true }],
      documentSuggestions: [
        {
          code: 'd1',
          name: 'Demanda',
          documentType: 'demanda',
          order: 1,
          isRequired: true,
        },
      ],
    },
    {
      code: 'contestacion',
      name: 'Contestación',
      order: 2,
      isOptional: false,
      activities: [],
      documentSuggestions: [],
    },
  ],
  deadlineRules: [
    {
      code: 'pl1',
      name: 'Plazo 1',
      trigger: 'stage_entered',
      triggerTargetCode: 'demanda',
      durationDays: 10,
      durationUnit: 'judicial_business_days',
      legalReference: 'CPC',
      onExpiry: 'alert_only',
      criticality: 'critical',
    },
  ],
  sinoeKeywordRules: [
    {
      code: 'sk1',
      pattern: 'ADMISION',
      matchMode: 'contains',
      action: 'advance_to_stage',
      actionTargetCode: 'contestacion',
      confidenceScore: 0.9,
      requiresApproval: false,
    },
  ],
};

describe('applyOverridesToTree', () => {
  it('keeps system provenance without overrides', () => {
    const r = applyOverridesToTree(base, [], [], true);
    expect(r.stages[0]!._meta.name.origin).toBe('SYSTEM');
    expect(r.stages[0]!.activities[0]!._p.name.origin).toBe('SYSTEM');
    expect(r.deadlineRules[0]!._p.name.origin).toBe('SYSTEM');
    expect(r.sinoeKeywordRules[0]!._p.pattern.origin).toBe('SYSTEM');
  });

  it('applies tenant MODIFY to stage name', () => {
    const tenant: OverrideRow[] = [
      {
        id: '1',
        targetType: BlueprintTargetType.STAGE,
        targetCode: 'demanda',
        operation: BlueprintOverrideOperation.MODIFY,
        patch: { name: 'Demanda (revisada firma)' },
      },
    ];
    const r = applyOverridesToTree(base, tenant, [], true);
    expect(r.stages[0]!._meta.name.value).toBe('Demanda (revisada firma)');
    expect(r.stages[0]!._meta.name.origin).toBe('TENANT');
  });

  it('applies instance ADD activity with INSTANCE origin', () => {
    const inst: OverrideRow[] = [
      {
        id: '2',
        targetType: BlueprintTargetType.ACTIVITY,
        targetCode: 'custom',
        operation: BlueprintOverrideOperation.ADD,
        patch: {
          stageCode: 'demanda',
          code: 'custom',
          name: 'Revisión interna',
          order: 2,
        },
      },
    ];
    const r = applyOverridesToTree(base, [], inst, true);
    const act = r.stages[0]!.activities.find((a) => a.code === 'custom');
    expect(act?.name).toBe('Revisión interna');
    expect(act?._p.name.origin).toBe('INSTANCE');
  });

  it('removes document suggestion and removes from tree', () => {
    const inst: OverrideRow[] = [
      {
        id: '3',
        targetType: BlueprintTargetType.DOCUMENT_SUGGESTION,
        targetCode: 'd1',
        operation: BlueprintOverrideOperation.REMOVE,
        patch: { stageCode: 'demanda' },
      },
    ];
    const r = applyOverridesToTree(base, [], inst, true);
    expect(r.stages[0]!.documentSuggestions).toHaveLength(0);
  });

  it('tenant then instance: instance wins on same stage name', () => {
    const tenant: OverrideRow[] = [
      {
        id: '4',
        targetType: BlueprintTargetType.STAGE,
        targetCode: 'demanda',
        operation: BlueprintOverrideOperation.MODIFY,
        patch: { name: 'TENANT' },
      },
    ];
    const inst: OverrideRow[] = [
      {
        id: '5',
        targetType: BlueprintTargetType.STAGE,
        targetCode: 'demanda',
        operation: BlueprintOverrideOperation.MODIFY,
        patch: { name: 'INSTANCE' },
      },
    ];
    const r = applyOverridesToTree(base, tenant, inst, true);
    expect(r.stages[0]!._meta.name.value).toBe('INSTANCE');
    expect(r.stages[0]!._meta.name.origin).toBe('INSTANCE');
  });

  it('skips tenant when tenantOrigin false (direct system+instance only)', () => {
    const tenant: OverrideRow[] = [
      {
        id: '6',
        targetType: BlueprintTargetType.STAGE,
        targetCode: 'demanda',
        operation: BlueprintOverrideOperation.MODIFY,
        patch: { name: 'Should be ignored' },
      },
    ];
    const r = applyOverridesToTree(base, tenant, [], false);
    expect(r.stages[0]!._meta.name.value).toBe('Demanda');
    expect(r.stages[0]!._meta.name.origin).toBe('SYSTEM');
  });
});
