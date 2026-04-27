import { MatterType, BlueprintDocumentType } from '@tracker/shared';
import type { SystemBlueprintDef } from './types';

export const DEMO_AND_FREEFORM: SystemBlueprintDef[] = [
  {
    code: 'demo-proceso-basico',
    name: 'DEMO — Proceso básico (3 etapas)',
    matterType: MatterType.OTHER,
    description: 'Demostración del motor: etapas, actividades obligatorias y con documento.',
    changelog: 'v1 seed demo',
    stages: [
      {
        code: 'inicio',
        name: 'Inicio',
        order: 0,
        activities: [
          { code: 'a1', name: 'Reunión con cliente / contraparte', order: 0, isMandatory: true },
          {
            code: 'a2',
            name: 'Recopilar documentos iniciales',
            order: 1,
            isMandatory: true,
            requiresDocument: true,
            suggestedDocumentType: BlueprintDocumentType.OTRO,
          },
          { code: 'a3', name: 'Análisis preliminar del caso', order: 2, isMandatory: false },
        ],
      },
      {
        code: 'en_curso',
        name: 'En curso',
        order: 1,
        activities: [
          {
            code: 'b1',
            name: 'Preparar escrito principal',
            order: 0,
            requiresDocument: true,
            suggestedDocumentType: BlueprintDocumentType.OTRO,
          },
          { code: 'b2', name: 'Revisión interna (colega)', order: 1, isMandatory: true },
          { code: 'b3', name: 'Presentar escrito / notificación', order: 2, isMandatory: true },
          { code: 'b4', name: 'Seguimiento a órgano o tercero', order: 3, isMandatory: false },
        ],
      },
      {
        code: 'cierre',
        name: 'Cierre',
        order: 2,
        activities: [
          {
            code: 'c1',
            name: 'Informe final al cliente',
            order: 0,
            isMandatory: true,
            requiresDocument: true,
            suggestedDocumentType: BlueprintDocumentType.OTRO,
          },
          { code: 'c2', name: 'Archivo y cierre lógico', order: 1, isMandatory: false },
        ],
      },
    ],
  },
  {
    code: 'trackable-generico-sin-proceso',
    name: 'Expediente genérico (gestión sin proceso estructurado)',
    matterType: MatterType.OTHER,
    changelog: 'v1 seed',
    stages: [
      {
        code: 'inicio',
        name: 'Inicio / Gestión',
        order: 0,
        activities: [
          { code: 'tarea_1', name: 'Primera tarea', order: 0, isMandatory: false, suggestedDocumentType: BlueprintDocumentType.OTRO },
        ],
      },
    ],
  },
  {
    code: 'freeform-estilo-libre',
    name: 'Estilo libre (una etapa, sin tareas iniciales)',
    matterType: MatterType.OTHER,
    changelog: 'v1 seed',
    stages: [
      {
        code: 'general',
        name: 'General',
        order: 0,
        activities: [],
      },
    ],
  },
];
