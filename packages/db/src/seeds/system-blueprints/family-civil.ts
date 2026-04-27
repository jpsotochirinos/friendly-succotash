import { MatterType, BlueprintDocumentType } from '@tracker/shared';
import type { SystemBlueprintDef, StageDef } from './types';

function familyStages(codePrefix: string): StageDef[] {
  return [
    {
      code: `${codePrefix}-prep`,
      name: 'Preparación',
      order: 0,
      activities: [
        { code: 'a1', name: 'Entrevista y encargo', order: 0, isMandatory: true },
        { code: 'a2', name: 'Recopilación de pruebas y documentos', order: 1, isMandatory: true, requiresDocument: true, suggestedDocumentType: BlueprintDocumentType.OTRO },
        { code: 'a3', name: 'Estrategia y costos', order: 2, isMandatory: false },
        { code: 'a4', name: 'Minuta o borrador de demanda / escrito', order: 3, isMandatory: true, requiresDocument: true, suggestedDocumentType: BlueprintDocumentType.DEMANDA },
      ],
    },
    {
      code: `${codePrefix}-adm`,
      name: 'Admisión y contestación',
      order: 1,
      activities: [
        { code: 'b1', name: 'Presentación y emplazamiento', order: 0, isMandatory: true, requiresDocument: true, suggestedDocumentType: BlueprintDocumentType.CEDULA_NOTIFICACION },
        { code: 'b2', name: 'Revisión de contestación o excepciones', order: 1, isMandatory: true },
        { code: 'b3', name: 'Escrito de réplica o subsanación', order: 2, isMandatory: false, requiresDocument: true, suggestedDocumentType: BlueprintDocumentType.ESCRITO_CONTESTACION },
      ],
    },
    {
      code: `${codePrefix}-aud`,
      name: 'Audiencia / Medidas',
      order: 2,
      activities: [
        { code: 'c1', name: 'Preparación de audiencia', order: 0, isMandatory: true },
        { code: 'c2', name: 'Audiencia o vista (acta / minuta)', order: 1, isMandatory: true, requiresDocument: true, suggestedDocumentType: BlueprintDocumentType.ACTA_AUDIENCIA },
        { code: 'c3', name: 'Medidas o providencias', order: 2, isMandatory: false },
      ],
    },
    {
      code: `${codePrefix}-res`,
      name: 'Resolución y cierre',
      order: 3,
      activities: [
        { code: 'd1', name: 'Análisis de sentencia o auto', order: 0, isMandatory: true, requiresDocument: true, suggestedDocumentType: BlueprintDocumentType.SENTENCIA },
        { code: 'd2', name: 'Informe al cliente', order: 1, isMandatory: true },
        { code: 'd3', name: 'Recursos o cumplimiento', order: 2, isMandatory: false },
      ],
    },
  ];
}

const BASE = (code: string, name: string, prefix: string): SystemBlueprintDef => ({
  code,
  name,
  matterType: MatterType.FAMILY,
  changelog: 'v2 seed rich',
  enrichInPlace: true,
  stages: familyStages(prefix),
});

/** Civil / Familia — estructura enriquecida (reemplaza stubs v1 si el blueprint no está en uso). */
export const FAMILY_CIVIL_BLUEPRINTS: SystemBlueprintDef[] = [
  BASE('civil-familia-alimentos-demanda', 'Alimentos — Demanda', 'ali-dem'),
  BASE('civil-familia-alimentos-aumento', 'Alimentos — Aumento', 'ali-aum'),
  BASE('civil-familia-alimentos-prorrateo', 'Alimentos — Prorrateo', 'ali-pro'),
  BASE('civil-familia-divorcio-causal', 'Divorcio — Causal', 'div-cau'),
  BASE('civil-familia-divorcio-notarial', 'Divorcio — Notarial', 'div-not'),
  BASE('civil-familia-tenencia', 'Tenencia', 'ten'),
  BASE('civil-familia-visitas', 'Visitas / Régimen de comunicación', 'vis'),
  BASE('civil-familia-sucesion-intestada', 'Sucesión — Intestada', 'suc-int'),
  BASE('civil-familia-sucesion-testada', 'Sucesión — Testada', 'suc-tes'),
];
