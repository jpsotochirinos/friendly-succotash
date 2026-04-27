import type { EntityManager } from '@mikro-orm/core';
import {
  WorkflowDefinition,
  WorkflowState,
  WorkflowTransition,
} from '../entities';
import {
  MatterType,
  WorkflowStateCategory,
  DeadlineType,
  DeadlineCalendarType,
} from '@tracker/shared';

const SLUG = 'civil-ordinario-cpc-pe';

type StageDef = {
  key: string;
  name: string;
  category: WorkflowStateCategory;
  order: number;
  isInitial?: boolean;
  deadlineType: DeadlineType;
  deadlineDays?: number;
  deadlineLawRef?: string;
  sinoeKeywords?: string[];
};

const STAGES: StageDef[] = [
  {
    key: 'civil_ord_01_demanda',
    name: 'Demanda',
    category: WorkflowStateCategory.TODO,
    order: 1,
    isInitial: true,
    deadlineType: DeadlineType.NONE,
    deadlineLawRef: 'Art. 424 CPC',
  },
  {
    key: 'civil_ord_02_calificacion',
    name: 'Calificación de la demanda',
    category: WorkflowStateCategory.IN_PROGRESS,
    order: 2,
    deadlineType: DeadlineType.FROM_STAGE_START,
    deadlineDays: 5,
    deadlineLawRef: 'Art. 128 CPC',
    sinoeKeywords: [
      'AUTO ADMISORIO',
      'ADMITIDA LA DEMANDA',
      'SE ADMITE',
      'INADMISIBLE',
      'IMPROCEDENTE',
    ],
  },
  {
    key: 'civil_ord_03_traslado',
    name: 'Traslado al demandado',
    category: WorkflowStateCategory.IN_PROGRESS,
    order: 3,
    deadlineType: DeadlineType.FROM_NOTIFICATION,
    deadlineDays: 30,
    deadlineLawRef: 'Art. 478 CPC',
    sinoeKeywords: [
      'CONTESTACION DE DEMANDA',
      'SE TIENE POR CONTESTADA',
      'EN REBELDIA',
    ],
  },
  {
    key: 'civil_ord_04_saneamiento',
    name: 'Saneamiento procesal',
    category: WorkflowStateCategory.IN_PROGRESS,
    order: 4,
    deadlineType: DeadlineType.FROM_STAGE_START,
    deadlineDays: 30,
    deadlineLawRef: 'Art. 465 CPC',
    sinoeKeywords: ['AUTO DE SANEAMIENTO', 'SE DECLARA SANEADO'],
  },
  {
    key: 'civil_ord_05_conciliacion',
    name: 'Audiencia de conciliación',
    category: WorkflowStateCategory.IN_PROGRESS,
    order: 5,
    deadlineType: DeadlineType.FROM_STAGE_START,
    deadlineDays: 20,
    deadlineLawRef: 'Art. 468 CPC',
    sinoeKeywords: [
      'SE SEÑALA FECHA DE AUDIENCIA DE CONCILIACION',
      'AUDIENCIA DE CONCILIACION',
    ],
  },
  {
    key: 'civil_ord_06_pruebas',
    name: 'Audiencia de pruebas',
    category: WorkflowStateCategory.IN_PROGRESS,
    order: 6,
    deadlineType: DeadlineType.FROM_STAGE_START,
    deadlineDays: 50,
    deadlineLawRef: 'Art. 202 CPC',
    sinoeKeywords: [
      'SE SEÑALA FECHA DE AUDIENCIA DE PRUEBAS',
      'AUDIENCIA DE PRUEBAS',
    ],
  },
  {
    key: 'civil_ord_07_alegatos',
    name: 'Alegatos',
    category: WorkflowStateCategory.IN_PROGRESS,
    order: 7,
    deadlineType: DeadlineType.FROM_STAGE_START,
    deadlineDays: 5,
    deadlineLawRef: 'Art. 212 CPC',
  },
  {
    key: 'civil_ord_08_sentencia_1',
    name: 'Sentencia de primera instancia',
    category: WorkflowStateCategory.IN_REVIEW,
    order: 8,
    deadlineType: DeadlineType.FROM_STAGE_START,
    deadlineDays: 25,
    deadlineLawRef: 'Art. 211 CPC',
    sinoeKeywords: ['SENTENCIA', 'FALLO', 'SE RESUELVE'],
  },
  {
    key: 'civil_ord_09_apelacion',
    name: 'Apelación',
    category: WorkflowStateCategory.IN_PROGRESS,
    order: 9,
    deadlineType: DeadlineType.FROM_NOTIFICATION,
    deadlineDays: 15,
    deadlineLawRef: 'Art. 373 CPC',
    sinoeKeywords: ['SE CONCEDE LA APELACION', 'ELEVESE'],
  },
  {
    key: 'civil_ord_10_sentencia_2',
    name: 'Sentencia de segunda instancia',
    category: WorkflowStateCategory.DONE,
    order: 10,
    deadlineType: DeadlineType.FROM_STAGE_START,
    deadlineDays: 50,
    deadlineLawRef: 'Art. 376 CPC',
  },
];

export async function seedLegalProcessTemplates(em: EntityManager): Promise<void> {
  const existing = await em.findOne(WorkflowDefinition, {
    slug: SLUG,
    isSystem: true,
    organization: null,
  });
  if (existing) {
    console.log('✓ Plantilla Civil Ordinario ya existe, omitiendo seed');
    return;
  }

  const now = new Date();
  const wf = em.create(WorkflowDefinition, {
    slug: SLUG,
    name: 'Proceso Civil Ordinario',
    description: 'Proceso de conocimiento regulado por el CPC (Perú).',
    isSystem: true,
    isDefault: false,
    jurisdiction: 'PE',
    matterType: MatterType.LITIGATION,
    appliesToAllTypes: true,
    applicableLaw: 'CPC',
    legalProcessCode: 'civil_ordinario',
    organization: null,
    createdAt: now,
    updatedAt: now,
  });

  const states: WorkflowState[] = [];
  for (const s of STAGES) {
    const st = em.create(WorkflowState, {
      workflow: wf,
      key: s.key,
      name: s.name,
      category: s.category,
      sortOrder: s.order,
      isInitial: !!s.isInitial,
      stageOrderIndex: s.order,
      deadlineType: s.deadlineType,
      deadlineDays: s.deadlineDays ?? undefined,
      deadlineCalendarType: DeadlineCalendarType.JUDICIAL,
      deadlineLawRef: s.deadlineLawRef ?? undefined,
      sinoeKeywords: s.sinoeKeywords ?? undefined,
      createdAt: now,
      updatedAt: now,
    });
    states.push(st);
  }

  for (let i = 0; i < states.length - 1; i++) {
    em.create(WorkflowTransition, {
      workflow: wf,
      fromState: states[i],
      toState: states[i + 1],
      name: `${STAGES[i].name} → ${STAGES[i + 1].name}`,
      requiredPermission: undefined,
      createdAt: now,
      updatedAt: now,
    });
  }

  await em.flush();
  console.log('✓ Plantilla Civil Ordinario (CPC) sembrada');
}
