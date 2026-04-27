import { MatterType, BlueprintDocumentType } from '@tracker/shared';
import type { SystemBlueprintDef, StageDef } from './types';

function threeStageProcess(prefix: string, labels: { s1: string; s2: string; s3: string }): StageDef[] {
  return [
    {
      code: `${prefix}-f1`,
      name: labels.s1,
      order: 0,
      activities: [
        { code: 'x1', name: 'Apertura y hechos', order: 0, isMandatory: true },
        { code: 'x2', name: 'Recopilación de medios de prueba', order: 1, isMandatory: true, requiresDocument: true, suggestedDocumentType: BlueprintDocumentType.OTRO },
        { code: 'x3', name: 'Estrategia y cronograma', order: 2, isMandatory: false },
      ],
    },
    {
      code: `${prefix}-f2`,
      name: labels.s2,
      order: 1,
      activities: [
        { code: 'y1', name: 'Trámite o negociación intermedia', order: 0, isMandatory: true },
        { code: 'y2', name: 'Audiencia, vista o ronda de alegatos', order: 1, isMandatory: false, requiresDocument: true, suggestedDocumentType: BlueprintDocumentType.ACTA_AUDIENCIA },
        { code: 'y3', name: 'Ampliación de prueba o alegatos', order: 2, isMandatory: false, requiresDocument: true, suggestedDocumentType: BlueprintDocumentType.ESCRITO_CONTESTACION },
        { code: 'y4', name: 'Seguimiento a órgano / tercero', order: 3, isMandatory: false },
      ],
    },
    {
      code: `${prefix}-f3`,
      name: labels.s3,
      order: 2,
      activities: [
        { code: 'z1', name: 'Resolución o cierre de instancia', order: 0, isMandatory: true, requiresDocument: true, suggestedDocumentType: BlueprintDocumentType.RESOLUCION },
        { code: 'z2', name: 'Informe al cliente y próximos pasos', order: 1, isMandatory: true },
        { code: 'z3', name: 'Recursos, cumplimiento o archivo', order: 2, isMandatory: false, requiresDocument: true, suggestedDocumentType: BlueprintDocumentType.OTRO },
      ],
    },
  ];
}

const M = (matter: MatterType, code: string, name: string, p: string, labels: { s1: string; s2: string; s3: string }): SystemBlueprintDef => ({
  code,
  name,
  matterType: matter,
  changelog: 'v2 matter catalog',
  stages: threeStageProcess(p, labels),
});

/** Dos plantillas base por cada `MatterType` (salvo FAMILY/OTHER, cubiertas aparte). */
export const MATTER_EXTRA_BLUEPRINTS: SystemBlueprintDef[] = [
  M(MatterType.LITIGATION, 'lit-civil-ordinario-v1', 'Civil — Ordinario (resumen)', 'lit-ord', {
    s1: 'Preparación y demanda',
    s2: 'Contestación e instrucción',
    s3: 'Alegatos y sentencia',
  }),
  M(MatterType.LITIGATION, 'lit-amparo-v1', 'Amparo — Trámite típico', 'lit-amp', {
    s1: 'Presentación y admisión',
    s2: 'Vista o audiencia constitucional',
    s3: 'Sentencia y ejecución',
  }),

  M(MatterType.LABOR, 'lab-despido-arbitrario-v1', 'Laboral — Despido aparentemente arbitrario', 'lab-desp', {
    s1: 'Pre-legal y notificación',
    s2: 'Mediación o proceso laboral',
    s3: 'Sentencia o finiquito',
  }),
  M(MatterType.LABOR, 'lab-beneficios-v1', 'Laboral — Reintegro de beneficios / planilla', 'lab-ben', {
    s1: 'Reclamo y documentación',
    s2: 'Inspección o fiscalización (si aplica)',
    s3: 'Cierre, pago o litigio',
  }),

  M(MatterType.CORPORATE, 'corp-constitucion-v1', 'Societario — Constitución básica', 'corp-const', {
    s1: 'Due diligence ligera y minuta',
    s2: 'Inscripción y formalidades',
    s3: 'Post-constitución (libros / cumplimientos)',
  }),
  M(MatterType.CORPORATE, 'corp-fusion-v1', 'Societario — Fusión (fases mínimas)', 'corp-fus', {
    s1: 'Estructuración y acuerdo marco',
    s2: 'Due diligence y documentación',
    s3: 'Cierre, inscripción e integración',
  }),

  M(MatterType.TAX, 'tax-reclamacion-sunat-v1', 'Tributario — Reclamación administrativa', 'tax-rec', {
    s1: 'Revisión de acto y plazos',
    s2: 'Recurso o descargo',
    s3: 'Resolución y vía subsiguiente',
  }),
  M(MatterType.TAX, 'tax-tf-v1', 'Tributario — Apelación / Tribunal Fiscal (esqueleto)', 'tax-tf', {
    s1: 'Estrategia y mérito',
    s2: 'Evidencia e informes',
    s3: 'Sustentación o laudo / resolución',
  }),

  M(MatterType.CRIMINAL, 'pen-denuncia-v1', 'Penal — Denuncia y etapa preliminar', 'pen-den', {
    s1: 'Asesoría y denuncia / querella',
    s2: 'Seguimiento fiscal / investigación',
    s3: 'Acuerdo, archivo o acusación',
  }),
  M(MatterType.CRIMINAL, 'pen-querella-v1', 'Penal — Querella particular (fases básicas)', 'pen-que', {
    s1: 'Estrategia y escritos',
    s2: 'Vista, audiencia o diligencias',
    s3: 'Recurso, sentencia o archivo',
  }),

  M(MatterType.ADMINISTRATIVE, 'adm-reconsideracion-v1', 'Administrativo — Reconsideración (modelo mínimo)', 'adm-rec', {
    s1: 'Solicitud y fundamento',
    s2: 'Descargos o ampliación',
    s3: 'Resolución y vía común o especial',
  }),
  M(MatterType.ADMINISTRATIVE, 'adm-contencioso-v1', 'Contencioso administrativo (esqueleto)', 'adm-cont', {
    s1: 'Preparación y demanda',
    s2: 'Contestación e instrucción',
    s3: 'Alegatos y sentencia',
  }),

  M(MatterType.ADVISORY, 'adv-consulta-compleja-v1', 'Asesoría — Consulta legal compleja', 'adv-c', {
    s1: 'Hechos y entregables',
    s2: 'Análisis y alternativas',
    s3: 'Informe u opinión final',
  }),
  M(MatterType.ADVISORY, 'adv-due-diligence-v1', 'Asesoría — Due diligence (fases básicas)', 'adv-dd', {
    s1: 'Alcance y data room',
    s2: 'Hallazgos y riesgos',
    s3: 'Informe y negociación',
  }),

  M(MatterType.REAL_ESTATE, 're-compraventa-v1', 'Inmobiliario — Compraventa', 're-cv', {
    s1: 'Negociación y minuta',
    s2: 'Verificación de gravámenes y firma',
    s3: 'Inscripción y entrega / pago',
  }),
  M(MatterType.REAL_ESTATE, 're-desalojo-ocupante-v1', 'Inmobiliario — Desalojo (ocupante precario) — básico', 're-des', {
    s1: 'Cese y notificación',
    s2: 'Demanda o mandamiento',
    s3: 'Lanzamiento o acuerdo',
  }),
];
