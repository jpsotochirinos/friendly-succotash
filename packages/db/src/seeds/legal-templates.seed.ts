import type { EntityManager } from '@mikro-orm/postgresql';
import { wrap } from '@mikro-orm/core';
import { WorkflowTemplate, WorkflowTemplateItem, WorkflowItem } from '../entities';
import { MatterType, ActionType, DomainEvents } from '@tracker/shared';

type TplNode = {
  title: string;
  kind?: string;
  actionType?: ActionType;
  offsetDays?: number;
  requiresDocument?: boolean;
  triggers?: Record<string, unknown>[];
  children?: TplNode[];
};

type TemplateDef = {
  name: string;
  description: string;
  matterType: MatterType;
  category: string;
  tree: TplNode[];
  /** Match legacy DB name and rename to `name` when found */
  legacyNames?: string[];
};

/** Reusable ECA snapshots (copied to WorkflowItem.metadata.triggers on instantiate). */
function judicialLeafTriggers(prefix: string): Record<string, unknown>[] {
  return [
    {
      id: `${prefix}:doc_upload_ip`,
      name: 'Documento subido → en progreso',
      event: DomainEvents.DOCUMENT_UPLOADED,
      condition: { all: [{ eq: ['item.currentStateKey', 'active'] }] },
      action: { type: 'transition', to: 'in_progress' },
      priority: 85,
      enabled: true,
    },
    {
      id: `${prefix}:due_near`,
      name: 'Aviso plazo próximo',
      event: DomainEvents.WORKFLOW_ITEM_DUE_DATE_NEAR,
      condition: { all: [] },
      action: {
        type: 'notify',
        title: 'Plazo próximo',
        message: 'Actuación con vencimiento en las próximas 24h',
      },
      priority: 50,
      enabled: true,
    },
    {
      id: `${prefix}:sinoe`,
      name: 'Notificación PJ (SINOE) → en revisión',
      event: DomainEvents.SINOE_NOTIFICATION_RECEIVED,
      condition: { all: [] },
      action: { type: 'transition', to: 'under_review' },
      priority: 90,
      enabled: true,
    },
  ];
}

function officeLeafTriggers(prefix: string): Record<string, unknown>[] {
  return [
    {
      id: `${prefix}:doc_upload_ip`,
      name: 'Documento subido → en progreso',
      event: DomainEvents.DOCUMENT_UPLOADED,
      condition: { all: [{ eq: ['item.currentStateKey', 'active'] }] },
      action: { type: 'transition', to: 'in_progress' },
      priority: 85,
      enabled: true,
    },
    {
      id: `${prefix}:doc_approved`,
      name: 'Documento aprobado → validado',
      event: DomainEvents.DOCUMENT_APPROVED,
      condition: {
        all: [{ in: ['item.currentStateKey', ['under_review', 'in_progress']] }],
      },
      action: { type: 'transition', to: 'validated' },
      priority: 82,
      enabled: true,
    },
    {
      id: `${prefix}:due_near`,
      name: 'Aviso plazo próximo',
      event: DomainEvents.WORKFLOW_ITEM_DUE_DATE_NEAR,
      condition: { all: [] },
      action: {
        type: 'notify',
        title: 'Plazo próximo',
        message: 'Actuación con vencimiento en las próximas 24h',
      },
      priority: 50,
      enabled: true,
    },
  ];
}

function createTemplateTree(
  em: EntityManager,
  template: WorkflowTemplate,
  nodes: TplNode[],
  parent?: WorkflowTemplateItem,
): void {
  nodes.forEach((n, i) => {
    const item = em.create(WorkflowTemplateItem, {
      template,
      parent,
      title: n.title,
      kind: n.kind,
      actionType: n.actionType,
      sortOrder: i,
      offsetDays: n.offsetDays,
      requiresDocument: n.requiresDocument ?? false,
      triggers: n.triggers?.length ? n.triggers : undefined,
    } as any);
    if (n.children?.length) {
      createTemplateTree(em, template, n.children, item);
    }
  });
}

async function deleteAllTemplateItems(em: EntityManager, templateId: string): Promise<void> {
  for (;;) {
    const items = await em.find(
      WorkflowTemplateItem,
      { template: templateId } as any,
      { filters: false },
    );
    if (items.length === 0) break;
    const hasChild = new Set<string>();
    for (const it of items) {
      const pid = (it.parent as WorkflowTemplateItem | undefined)?.id;
      if (pid) hasChild.add(pid);
    }
    const leaves = items.filter((it) => !hasChild.has(it.id));
    if (leaves.length === 0) {
      throw new Error(`deleteAllTemplateItems: cycle? template=${templateId}`);
    }
    for (const leaf of leaves) {
      em.remove(leaf);
    }
    await em.flush();
  }
}

async function isTemplateInUse(em: EntityManager, templateId: string): Promise<boolean> {
  const itemIds = await em.find(
    WorkflowTemplateItem,
    { template: templateId } as any,
    { fields: ['id'], filters: false },
  );
  if (itemIds.length === 0) return false;
  const ids = itemIds.map((r) => r.id);
  const cnt = await em.count(
    WorkflowItem,
    { instantiatedFromTemplateItemId: { $in: ids } } as any,
    { filters: false },
  );
  return cnt > 0;
}

async function findTemplateByNameOrLegacy(
  em: EntityManager,
  def: TemplateDef,
): Promise<WorkflowTemplate | null> {
  let t = await em.findOne(WorkflowTemplate, { name: def.name, isSystem: true } as any);
  if (t) return t;
  for (const legacy of def.legacyNames ?? []) {
    const old = await em.findOne(WorkflowTemplate, { name: legacy, isSystem: true } as any);
    if (old) {
      (old as any).name = def.name;
      return old;
    }
  }
  return null;
}

type SeedStats = {
  created: number;
  replaced: number;
  versioned: number;
  skipped: number;
};

async function upsertSystemTemplate(em: EntityManager, def: TemplateDef, stats: SeedStats): Promise<void> {
  let template = await findTemplateByNameOrLegacy(em, def);

  const applyMeta = (tpl: WorkflowTemplate) => {
    wrap(tpl).assign({
      description: def.description,
      matterType: def.matterType,
      category: def.category,
      jurisdiction: 'PE',
      isSystem: true,
    } as any);
  };

  if (!template) {
    template = em.create(WorkflowTemplate, {
      name: def.name,
      description: def.description,
      matterType: def.matterType,
      category: def.category,
      jurisdiction: 'PE',
      isSystem: true,
    } as any);
    createTemplateTree(em, template, def.tree);
    stats.created++;
    return;
  }

  applyMeta(template);
  const inUse = await isTemplateInUse(em, template.id);

  if (!inUse) {
    await deleteAllTemplateItems(em, template.id);
    createTemplateTree(em, template, def.tree);
    stats.replaced++;
    return;
  }

  const v2Name = `${def.name} (v2)`;
  let v2 = await em.findOne(WorkflowTemplate, { name: v2Name, isSystem: true } as any);
  if (v2) {
    const v2InUse = await isTemplateInUse(em, v2.id);
    if (!v2InUse) {
      applyMeta(v2);
      await deleteAllTemplateItems(em, v2.id);
      createTemplateTree(em, v2, def.tree);
      stats.replaced++;
    } else {
      stats.skipped++;
    }
    return;
  }

  v2 = em.create(WorkflowTemplate, {
    name: v2Name,
    description: def.description,
    matterType: def.matterType,
    category: def.category,
    jurisdiction: 'PE',
    isSystem: true,
  } as any);
  createTemplateTree(em, v2, def.tree);
  stats.versioned++;
}

const TEMPLATES: TemplateDef[] = [
  {
    name: 'Demanda laboral ordinaria (NLPT)',
    description:
      'Ley 29497 (NLPT): postulatoria, calificación, audiencia de conciliación (art. 43), audiencia de juzgamiento (art. 44), sentencia, apelación y casación (art. 34). Sin conciliación OSCE (no aplica).',
    matterType: MatterType.LABOR,
    category: 'Contencioso laboral',
    tree: [
      {
        title: 'Postulatoria',
        kind: 'Fase',
        offsetDays: 0,
        children: [
          {
            title: 'Redacción de demanda',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 7,
            triggers: judicialLeafTriggers('nlpt-demanda'),
          },
          {
            title: 'Pago de derechos / tasas judiciales',
            kind: 'Diligencia',
            actionType: ActionType.PAY_COURT_FEE,
            offsetDays: 10,
            triggers: judicialLeafTriggers('nlpt-tasa'),
          },
          {
            title: 'Presentación en mesa de partes / expediente electrónico',
            kind: 'Diligencia',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 12,
            triggers: judicialLeafTriggers('nlpt-mesa'),
          },
        ],
      },
      {
        title: 'Calificación y auto admisorio',
        kind: 'Fase',
        offsetDays: 18,
        children: [
          {
            title: 'Traslado de demanda y fijación de audiencias',
            kind: 'Diligencia',
            actionType: ActionType.NOTIFY_PARTY,
            offsetDays: 22,
            triggers: judicialLeafTriggers('nlpt-traslado'),
          },
        ],
      },
      {
        title: 'Audiencia de conciliación (NLPT art. 43)',
        kind: 'Fase',
        offsetDays: 35,
        children: [
          {
            title: 'Audiencia de conciliación',
            kind: 'Audiencia',
            actionType: ActionType.SCHEDULE_HEARING,
            offsetDays: 40,
            triggers: judicialLeafTriggers('nlpt-conc'),
          },
        ],
      },
      {
        title: 'Audiencia de juzgamiento (NLPT art. 44)',
        kind: 'Fase',
        offsetDays: 55,
        children: [
          {
            title: 'Preparación y audiencia de juzgamiento',
            kind: 'Audiencia',
            actionType: ActionType.SCHEDULE_HEARING,
            offsetDays: 65,
            triggers: judicialLeafTriggers('nlpt-juz'),
          },
        ],
      },
      {
        title: 'Sentencia',
        kind: 'Fase',
        offsetDays: 90,
        children: [
          {
            title: 'Análisis de sentencia y notificación',
            kind: 'Diligencia',
            actionType: ActionType.NOTIFY_PARTY,
            offsetDays: 95,
            triggers: judicialLeafTriggers('nlpt-sent'),
          },
        ],
      },
      {
        title: 'Apelación',
        kind: 'Fase',
        offsetDays: 100,
        children: [
          {
            title: 'Recurso de apelación (efecto suspensivo)',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 105,
            triggers: judicialLeafTriggers('nlpt-apela'),
          },
        ],
      },
      {
        title: 'Casación (NLPT art. 34)',
        kind: 'Fase',
        offsetDays: 130,
        children: [
          {
            title: 'Recurso de casación (si procede)',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 140,
            triggers: judicialLeafTriggers('nlpt-casa'),
          },
        ],
      },
    ],
  },
  {
    name: 'Divorcio por causal (contencioso)',
    description:
      'CPC: proceso de conocimiento (art. 480-485). Incluye saneamiento, puntos controvertidos, audiencia de pruebas y consulta (CPC art. 408) si no hay apelación.',
    matterType: MatterType.FAMILY,
    category: 'Familia',
    tree: [
      {
        title: 'Demanda',
        kind: 'Fase',
        children: [
          {
            title: 'Demanda de divorcio',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 5,
            triggers: judicialLeafTriggers('div-dem'),
          },
        ],
      },
      {
        title: 'Contestación',
        kind: 'Fase',
        offsetDays: 30,
        children: [
          {
            title: 'Análisis de contestación',
            kind: 'Diligencia',
            offsetDays: 35,
            triggers: judicialLeafTriggers('div-cont'),
          },
        ],
      },
      {
        title: 'Audiencia de saneamiento y conciliación',
        kind: 'Fase',
        offsetDays: 45,
        children: [
          {
            title: 'Audiencia',
            kind: 'Audiencia',
            actionType: ActionType.SCHEDULE_HEARING,
            offsetDays: 50,
            triggers: judicialLeafTriggers('div-sane'),
          },
        ],
      },
      {
        title: 'Saneamiento procesal y fijación de puntos controvertidos',
        kind: 'Fase',
        offsetDays: 55,
        children: [
          {
            title: 'Auto de saneamiento / puntos controvertidos',
            kind: 'Diligencia',
            offsetDays: 58,
            triggers: judicialLeafTriggers('div-puntos'),
          },
        ],
      },
      {
        title: 'Actuación probatoria',
        kind: 'Fase',
        offsetDays: 65,
        children: [
          {
            title: 'Ofrecimiento y práctica de medios probatorios',
            kind: 'Diligencia',
            offsetDays: 75,
            triggers: judicialLeafTriggers('div-prueb'),
          },
        ],
      },
      {
        title: 'Audiencia de pruebas',
        kind: 'Fase',
        offsetDays: 95,
        children: [
          {
            title: 'Audiencia única de pruebas',
            kind: 'Audiencia',
            actionType: ActionType.SCHEDULE_HEARING,
            offsetDays: 100,
            triggers: judicialLeafTriggers('div-audpr'),
          },
        ],
      },
      {
        title: 'Alegatos',
        kind: 'Fase',
        offsetDays: 110,
        children: [
          {
            title: 'Alegatos orales o escritos',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 115,
            triggers: judicialLeafTriggers('div-aleg'),
          },
        ],
      },
      {
        title: 'Sentencia',
        kind: 'Fase',
        offsetDays: 130,
        children: [
          {
            title: 'Sentencia de primer grado',
            kind: 'Diligencia',
            actionType: ActionType.NOTIFY_PARTY,
            offsetDays: 135,
            triggers: judicialLeafTriggers('div-sent'),
          },
        ],
      },
      {
        title: 'Consulta (CPC art. 408) si no hay apelación',
        kind: 'Fase',
        offsetDays: 145,
        children: [
          {
            title: 'Consulta al juez / archivo',
            kind: 'Diligencia',
            offsetDays: 150,
            triggers: judicialLeafTriggers('div-cons'),
          },
        ],
      },
    ],
  },
  {
    name: 'Constitución de sociedad anónima cerrada (SAC)',
    description:
      'LGS (Ley 26887): reserva de nombre SUNARP, minuta, escritura pública, inscripción registral, RUC, libros societarios y legalización de libros contables.',
    matterType: MatterType.CORPORATE,
    category: 'Societario',
    tree: [
      {
        title: 'Reserva de nombre (SUNARP / SID)',
        kind: 'Fase',
        offsetDays: 0,
        children: [
          {
            title: 'Solicitud y constancia de reserva',
            kind: 'Diligencia',
            actionType: ActionType.EXTERNAL_CHECK,
            offsetDays: 3,
            triggers: officeLeafTriggers('sac-reserva'),
          },
        ],
      },
      {
        title: 'Preparación',
        kind: 'Fase',
        offsetDays: 5,
        children: [
          {
            title: 'Minuta de estatutos y acuerdos',
            kind: 'Escrito',
            actionType: ActionType.DOC_CREATION,
            offsetDays: 10,
            triggers: officeLeafTriggers('sac-minuta'),
          },
          { title: 'Check-list societario (capital, directorio)', kind: 'Hito', offsetDays: 12 },
        ],
      },
      {
        title: 'Escritura pública',
        kind: 'Fase',
        offsetDays: 18,
        children: [
          {
            title: 'Firma ante notario / partida registral',
            kind: 'Diligencia',
            offsetDays: 22,
            triggers: officeLeafTriggers('sac-esc'),
          },
        ],
      },
      {
        title: 'SUNARP — Registro de Personas Jurídicas',
        kind: 'Fase',
        offsetDays: 28,
        children: [
          {
            title: 'Inscripción y obtención de partida',
            kind: 'Diligencia',
            offsetDays: 35,
            triggers: officeLeafTriggers('sac-rpj'),
          },
        ],
      },
      {
        title: 'SUNAT — RUC y régimen tributario',
        kind: 'Fase',
        offsetDays: 40,
        children: [
          {
            title: 'Inicio de actividades',
            kind: 'Diligencia',
            offsetDays: 45,
            triggers: officeLeafTriggers('sac-ruc'),
          },
        ],
      },
      {
        title: 'Libros societarios',
        kind: 'Fase',
        offsetDays: 48,
        children: [
          {
            title: 'Apertura de libros (actas, junta, matrícula de acciones)',
            kind: 'Diligencia',
            offsetDays: 52,
            triggers: officeLeafTriggers('sac-libsoc'),
          },
        ],
      },
      {
        title: 'Legalización de libros contables',
        kind: 'Fase',
        offsetDays: 55,
        children: [
          {
            title: 'Legalización ante notario o colegio',
            kind: 'Diligencia',
            offsetDays: 58,
            triggers: officeLeafTriggers('sac-libct'),
          },
        ],
      },
      {
        title: 'Licencias y registros locales',
        kind: 'Fase',
        offsetDays: 60,
        children: [
          {
            title: 'Municipal / sectorial según giro',
            kind: 'Diligencia',
            offsetDays: 70,
            triggers: officeLeafTriggers('sac-lic'),
          },
        ],
      },
    ],
  },
  {
    name: 'Due diligence M&A',
    description:
      'Revisión societaria, laboral, tributaria, contratos; Representations & Warranties / disclosure; informe, negociación y cierre (SPA / closing).',
    matterType: MatterType.CORPORATE,
    category: 'M&A',
    tree: [
      { title: 'Kick-off y data room', kind: 'Fase', offsetDays: 0 },
      {
        title: 'Revisión societaria',
        kind: 'Fase',
        offsetDays: 5,
        children: [
          {
            title: 'Libros y acuerdos de directorio / junta',
            kind: 'Diligencia',
            offsetDays: 10,
            triggers: officeLeafTriggers('dd-soc'),
          },
        ],
      },
      {
        title: 'Revisión laboral',
        kind: 'Fase',
        offsetDays: 8,
        children: [
          {
            title: 'Planillas, plan de beneficios, litigios',
            kind: 'Diligencia',
            offsetDays: 15,
            triggers: officeLeafTriggers('dd-lab'),
          },
        ],
      },
      {
        title: 'Revisión tributaria',
        kind: 'Fase',
        offsetDays: 8,
        children: [
          {
            title: 'Declaraciones y créditos fiscales',
            kind: 'Diligencia',
            offsetDays: 15,
            triggers: officeLeafTriggers('dd-tax'),
          },
        ],
      },
      {
        title: 'Contratos clave',
        kind: 'Fase',
        offsetDays: 10,
        children: [
          {
            title: 'Clientes, proveedores, financiamiento',
            kind: 'Diligencia',
            offsetDays: 18,
            triggers: officeLeafTriggers('dd-ctr'),
          },
        ],
      },
      {
        title: 'Representations & Warranties / disclosure schedules',
        kind: 'Fase',
        offsetDays: 20,
        children: [
          {
            title: 'R&W y calendario de revelación',
            kind: 'Escrito',
            actionType: ActionType.DOC_CREATION,
            offsetDays: 25,
            triggers: officeLeafTriggers('dd-rw'),
          },
        ],
      },
      {
        title: 'Informe de DD',
        kind: 'Fase',
        offsetDays: 28,
        children: [
          {
            title: 'Informe final y Q&A',
            kind: 'Entregable',
            actionType: ActionType.DOC_CREATION,
            offsetDays: 32,
            triggers: officeLeafTriggers('dd-inf'),
          },
        ],
      },
      {
        title: 'Signing & Closing (SPA)',
        kind: 'Fase',
        offsetDays: 35,
        children: [
          {
            title: 'Negociación SPA, condiciones suspensivas y cierre',
            kind: 'Diligencia',
            offsetDays: 40,
            triggers: officeLeafTriggers('dd-close'),
          },
        ],
      },
    ],
  },
  {
    name: 'Contrato de prestación de servicios (privado)',
    description: 'Propuesta, redacción, negociación, firma y archivo (entre privados).',
    matterType: MatterType.ADVISORY,
    category: 'Contratos',
    legacyNames: ['Contrato de prestación de servicios'],
    tree: [
      {
        title: 'Propuesta comercial / alcance',
        kind: 'Fase',
        offsetDays: 0,
        triggers: officeLeafTriggers('cps-prop'),
      },
      {
        title: 'Redacción del contrato',
        kind: 'Fase',
        offsetDays: 5,
        children: [
          {
            title: 'Minuta',
            kind: 'Escrito',
            actionType: ActionType.DOC_CREATION,
            offsetDays: 8,
            triggers: officeLeafTriggers('cps-min'),
          },
        ],
      },
      {
        title: 'Negociación con contraparte',
        kind: 'Fase',
        offsetDays: 12,
        triggers: officeLeafTriggers('cps-neg'),
      },
      {
        title: 'Firma y formalización',
        kind: 'Fase',
        offsetDays: 20,
        children: [
          {
            title: 'Firma electrónica o física',
            kind: 'Diligencia',
            offsetDays: 22,
            triggers: officeLeafTriggers('cps-firma'),
          },
        ],
      },
      {
        title: 'Archivo y seguimiento',
        kind: 'Fase',
        offsetDays: 25,
        triggers: officeLeafTriggers('cps-arch'),
      },
    ],
  },
  {
    name: 'Amparo constitucional',
    description:
      'Ley 31307 (Nuevo Código Procesal Constitucional, 2021): demanda, admisión, traslado, contestación, audiencia única, sentencia, apelación y RAC ante el Tribunal Constitucional.',
    matterType: MatterType.LITIGATION,
    category: 'Constitucional',
    tree: [
      {
        title: 'Demanda de amparo',
        kind: 'Fase',
        children: [
          {
            title: 'Redacción y presentación',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 3,
            triggers: judicialLeafTriggers('amp-dem'),
          },
        ],
      },
      {
        title: 'Admisión a trámite',
        kind: 'Fase',
        offsetDays: 12,
        children: [
          {
            title: 'Notificación de admisión',
            kind: 'Diligencia',
            actionType: ActionType.NOTIFY_PARTY,
            offsetDays: 15,
            triggers: judicialLeafTriggers('amp-adm'),
          },
        ],
      },
      {
        title: 'Traslado de la demanda',
        kind: 'Fase',
        offsetDays: 18,
        children: [
          {
            title: 'Traslado al demandado',
            kind: 'Diligencia',
            actionType: ActionType.NOTIFY_PARTY,
            offsetDays: 20,
            triggers: judicialLeafTriggers('amp-tras'),
          },
        ],
      },
      {
        title: 'Contestación',
        kind: 'Fase',
        offsetDays: 30,
        children: [
          {
            title: 'Análisis de contestación',
            kind: 'Diligencia',
            offsetDays: 35,
            triggers: judicialLeafTriggers('amp-cont'),
          },
        ],
      },
      {
        title: 'Audiencia única (1ra instancia)',
        kind: 'Fase',
        offsetDays: 45,
        children: [
          {
            title: 'Audiencia única',
            kind: 'Audiencia',
            actionType: ActionType.SCHEDULE_HEARING,
            offsetDays: 50,
            triggers: judicialLeafTriggers('amp-aud'),
          },
        ],
      },
      {
        title: 'Sentencia de primer grado',
        kind: 'Fase',
        offsetDays: 70,
        children: [
          {
            title: 'Sentencia y notificación',
            kind: 'Diligencia',
            actionType: ActionType.NOTIFY_PARTY,
            offsetDays: 75,
            triggers: judicialLeafTriggers('amp-sent1'),
          },
        ],
      },
      {
        title: 'Apelación',
        kind: 'Fase',
        offsetDays: 80,
        children: [
          {
            title: 'Recurso de apelación',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 85,
            triggers: judicialLeafTriggers('amp-apela'),
          },
        ],
      },
      {
        title: 'RAC y vista ante el Tribunal Constitucional (Ley 31307)',
        kind: 'Fase',
        offsetDays: 100,
        children: [
          {
            title: 'Recurso de agravio constitucional (RAC)',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 110,
            triggers: judicialLeafTriggers('amp-rac'),
          },
          {
            title: 'Sentencia del Tribunal Constitucional',
            kind: 'Diligencia',
            actionType: ActionType.NOTIFY_PARTY,
            offsetDays: 200,
            triggers: judicialLeafTriggers('amp-tc'),
          },
        ],
      },
    ],
  },
  {
    name: 'Contrato con entidad pública (Ley 30225)',
    description:
      'Selección de proveedor del Estado: registro, consultas, ofertas, evaluación, buena pro y perfeccionamiento (referencia Ley 30225 y reglamento).',
    matterType: MatterType.ADVISORY,
    category: 'Contratación pública',
    tree: [
      {
        title: 'Registro y habilitación',
        kind: 'Fase',
        offsetDays: 0,
        children: [
          {
            title: 'Registro en SEACE / verificación de requisitos',
            kind: 'Diligencia',
            actionType: ActionType.EXTERNAL_CHECK,
            offsetDays: 3,
            triggers: officeLeafTriggers('cp-reg'),
          },
        ],
      },
      {
        title: 'Consultas y observaciones a bases',
        kind: 'Fase',
        offsetDays: 5,
        children: [
          {
            title: 'Consultas y absolución de consultas',
            kind: 'Diligencia',
            offsetDays: 12,
            triggers: officeLeafTriggers('cp-cons'),
          },
        ],
      },
      {
        title: 'Integración de bases',
        kind: 'Fase',
        offsetDays: 15,
        children: [
          {
            title: 'Recepción de bases integradas',
            kind: 'Diligencia',
            actionType: ActionType.DOC_UPLOAD,
            offsetDays: 18,
            triggers: officeLeafTriggers('cp-bases'),
          },
        ],
      },
      {
        title: 'Presentación de oferta',
        kind: 'Fase',
        offsetDays: 22,
        children: [
          {
            title: 'Elaboración y envío de oferta',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 28,
            triggers: officeLeafTriggers('cp-oferta'),
          },
        ],
      },
      {
        title: 'Evaluación y buena pro',
        kind: 'Fase',
        offsetDays: 35,
        children: [
          {
            title: 'Sustentación / evaluación y otorgamiento de buena pro',
            kind: 'Audiencia',
            actionType: ActionType.SCHEDULE_HEARING,
            offsetDays: 45,
            triggers: officeLeafTriggers('cp-eval'),
          },
        ],
      },
      {
        title: 'Perfeccionamiento y firma del contrato',
        kind: 'Fase',
        offsetDays: 50,
        children: [
          {
            title: 'Suscripción del contrato estatal',
            kind: 'Diligencia',
            actionType: ActionType.APPROVAL,
            offsetDays: 55,
            triggers: officeLeafTriggers('cp-firma'),
          },
        ],
      },
    ],
  },
  {
    name: 'Alimentos (menor de edad) — proceso único',
    description:
      'Código de los Niños y Adolescentes (D.L. 997): proceso único de alimentos (arts. 160-182): demanda, calificación, contestación, audiencia única, sentencia y apelación.',
    matterType: MatterType.FAMILY,
    category: 'Familia',
    tree: [
      {
        title: 'Demanda',
        kind: 'Fase',
        children: [
          {
            title: 'Demanda de alimentos',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 5,
            triggers: judicialLeafTriggers('ali-dem'),
          },
        ],
      },
      {
        title: 'Calificación',
        kind: 'Fase',
        offsetDays: 15,
        children: [
          {
            title: 'Auto admisorio y traslado',
            kind: 'Diligencia',
            actionType: ActionType.NOTIFY_PARTY,
            offsetDays: 18,
            triggers: judicialLeafTriggers('ali-cal'),
          },
        ],
      },
      {
        title: 'Contestación',
        kind: 'Fase',
        offsetDays: 30,
        children: [
          {
            title: 'Contestación del demandado',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 35,
            triggers: judicialLeafTriggers('ali-cont'),
          },
        ],
      },
      {
        title: 'Audiencia única (conciliación, pruebas, alegatos)',
        kind: 'Fase',
        offsetDays: 50,
        children: [
          {
            title: 'Audiencia única',
            kind: 'Audiencia',
            actionType: ActionType.SCHEDULE_HEARING,
            offsetDays: 55,
            triggers: judicialLeafTriggers('ali-aud'),
          },
        ],
      },
      {
        title: 'Sentencia',
        kind: 'Fase',
        offsetDays: 75,
        children: [
          {
            title: 'Sentencia y notificación',
            kind: 'Diligencia',
            actionType: ActionType.NOTIFY_PARTY,
            offsetDays: 80,
            triggers: judicialLeafTriggers('ali-sent'),
          },
        ],
      },
      {
        title: 'Apelación',
        kind: 'Fase',
        offsetDays: 90,
        children: [
          {
            title: 'Recurso de apelación',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 95,
            triggers: judicialLeafTriggers('ali-apela'),
          },
        ],
      },
    ],
  },
  {
    name: 'Tenencia y régimen de visitas',
    description:
      'Código de los Niños y Adolescentes (D.L. 997) y CPC complementario: demanda, informes periciales si se ordenan, audiencia, sentencia.',
    matterType: MatterType.FAMILY,
    category: 'Familia',
    tree: [
      {
        title: 'Demanda',
        kind: 'Fase',
        children: [
          {
            title: 'Demanda de tenencia / visitas',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 5,
            triggers: judicialLeafTriggers('ten-dem'),
          },
        ],
      },
      {
        title: 'Informes y pericia',
        kind: 'Fase',
        offsetDays: 25,
        children: [
          {
            title: 'Informe psicológico / social (si ordenado)',
            kind: 'Diligencia',
            offsetDays: 40,
            triggers: judicialLeafTriggers('ten-inf'),
          },
        ],
      },
      {
        title: 'Audiencia única',
        kind: 'Fase',
        offsetDays: 55,
        children: [
          {
            title: 'Audiencia',
            kind: 'Audiencia',
            actionType: ActionType.SCHEDULE_HEARING,
            offsetDays: 60,
            triggers: judicialLeafTriggers('ten-aud'),
          },
        ],
      },
      {
        title: 'Sentencia',
        kind: 'Fase',
        offsetDays: 85,
        children: [
          {
            title: 'Sentencia y cumplimiento',
            kind: 'Diligencia',
            actionType: ActionType.NOTIFY_PARTY,
            offsetDays: 90,
            triggers: judicialLeafTriggers('ten-sent'),
          },
        ],
      },
    ],
  },
  {
    name: 'Divorcio notarial o municipal',
    description:
      'Ley 29227 y Reglamento (D.S. 009-2008-JUS): verificación de requisitos, solicitud, publicación, audiencia única, acta/resolución e inscripción.',
    matterType: MatterType.FAMILY,
    category: 'Familia',
    tree: [
      {
        title: 'Verificación de requisitos',
        kind: 'Fase',
        offsetDays: 0,
        children: [
          {
            title: 'Check-list (causales, hijos, bienes)',
            kind: 'Diligencia',
            offsetDays: 3,
            triggers: officeLeafTriggers('dn-req'),
          },
        ],
      },
      {
        title: 'Solicitud',
        kind: 'Fase',
        offsetDays: 7,
        children: [
          {
            title: 'Presentación de solicitud',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 10,
            triggers: officeLeafTriggers('dn-sol'),
          },
        ],
      },
      {
        title: 'Publicación',
        kind: 'Fase',
        offsetDays: 15,
        children: [
          {
            title: 'Publicación de edictos',
            kind: 'Diligencia',
            actionType: ActionType.NOTIFICATION,
            offsetDays: 25,
            triggers: officeLeafTriggers('dn-pub'),
          },
        ],
      },
      {
        title: 'Audiencia única',
        kind: 'Fase',
        offsetDays: 35,
        children: [
          {
            title: 'Audiencia ante notario o municipalidad',
            kind: 'Audiencia',
            actionType: ActionType.SCHEDULE_HEARING,
            offsetDays: 40,
            triggers: officeLeafTriggers('dn-aud'),
          },
        ],
      },
      {
        title: 'Acta o resolución e inscripción',
        kind: 'Fase',
        offsetDays: 45,
        children: [
          {
            title: 'Inscripción registral / RENIEC según caso',
            kind: 'Diligencia',
            actionType: ActionType.EXTERNAL_CHECK,
            offsetDays: 55,
            triggers: officeLeafTriggers('dn-ins'),
          },
        ],
      },
    ],
  },
  {
    name: 'Desalojo (judicial o notarial)',
    description:
      'Vía judicial sumarísima (CPC arts. 585-596) o desalojo notarial (Ley 30933) con requerimiento de cumplimiento y lanzamiento.',
    matterType: MatterType.REAL_ESTATE,
    category: 'Inmobiliario',
    tree: [
      {
        title: 'Ruta judicial (sumarísimo)',
        kind: 'Fase',
        offsetDays: 0,
        children: [
          {
            title: 'Demanda de desalojo',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 5,
            triggers: judicialLeafTriggers('des-j-dem'),
          },
          {
            title: 'Audiencia única / sentencia',
            kind: 'Audiencia',
            actionType: ActionType.SCHEDULE_HEARING,
            offsetDays: 30,
            triggers: judicialLeafTriggers('des-j-aud'),
          },
          {
            title: 'Ejecución / lanzamiento',
            kind: 'Diligencia',
            offsetDays: 45,
            triggers: judicialLeafTriggers('des-j-ej'),
          },
        ],
      },
      {
        title: 'Ruta notarial (Ley 30933)',
        kind: 'Fase',
        offsetDays: 0,
        children: [
          {
            title: 'Requerimiento de cumplimiento de obligación',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 7,
            triggers: officeLeafTriggers('des-n-req'),
          },
          {
            title: 'Resolución notarial y coordinación de lanzamiento',
            kind: 'Diligencia',
            offsetDays: 25,
            triggers: officeLeafTriggers('des-n-lanz'),
          },
        ],
      },
    ],
  },
  {
    name: 'Obligación de dar suma de dinero (ejecutivo)',
    description:
      'Proceso ejecutivo (CPC arts. 688-704): demanda con título ejecutivo, mandato ejecutivo, contradicción, medidas y ejecución forzada.',
    matterType: MatterType.LITIGATION,
    category: 'Civil',
    tree: [
      {
        title: 'Demanda ejecutiva',
        kind: 'Fase',
        offsetDays: 0,
        children: [
          {
            title: 'Demanda y título ejecutivo',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 5,
            triggers: judicialLeafTriggers('ej-dem'),
          },
        ],
      },
      {
        title: 'Mandato ejecutivo y traslado',
        kind: 'Fase',
        offsetDays: 15,
        children: [
          {
            title: 'Mandato y notificación',
            kind: 'Diligencia',
            actionType: ActionType.NOTIFY_PARTY,
            offsetDays: 20,
            triggers: judicialLeafTriggers('ej-mand'),
          },
        ],
      },
      {
        title: 'Contradicción',
        kind: 'Fase',
        offsetDays: 30,
        children: [
          {
            title: 'Oposición del ejecutado',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 35,
            triggers: judicialLeafTriggers('ej-cont'),
          },
        ],
      },
      {
        title: 'Ejecución forzada',
        kind: 'Fase',
        offsetDays: 50,
        children: [
          {
            title: 'Medidas cautelares / embargo / remate',
            kind: 'Diligencia',
            offsetDays: 60,
            triggers: judicialLeafTriggers('ej-exec'),
          },
        ],
      },
    ],
  },
  {
    name: 'Prescripción adquisitiva (judicial o notarial)',
    description:
      'CC art. 950; prescripción notarial de inmuebles urbanos (Ley 27157): vía judicial abreviada o expediente notarial.',
    matterType: MatterType.REAL_ESTATE,
    category: 'Inmobiliario',
    tree: [
      {
        title: 'Vía judicial (proceso abreviado)',
        kind: 'Fase',
        offsetDays: 0,
        children: [
          {
            title: 'Demanda de prescripción',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 7,
            triggers: judicialLeafTriggers('pres-j-dem'),
          },
          {
            title: 'Sentencia declarativa e inscripción',
            kind: 'Diligencia',
            offsetDays: 120,
            triggers: judicialLeafTriggers('pres-j-sent'),
          },
        ],
      },
      {
        title: 'Vía notarial (Ley 27157)',
        kind: 'Fase',
        offsetDays: 0,
        children: [
          {
            title: 'Expediente notarial y publicaciones',
            kind: 'Diligencia',
            actionType: ActionType.EXTERNAL_CHECK,
            offsetDays: 30,
            triggers: officeLeafTriggers('pres-n-exp'),
          },
          {
            title: 'Inscripción en SUNARP',
            kind: 'Diligencia',
            offsetDays: 90,
            triggers: officeLeafTriggers('pres-n-ins'),
          },
        ],
      },
    ],
  },
  {
    name: 'Proceso contencioso-administrativo',
    description:
      'TUO de la Ley 27584 (D.S. 013-2008-JUS): agotamiento de la vía administrativa, demanda, saneamiento, pruebas, sentencia y apelación.',
    matterType: MatterType.ADMINISTRATIVE,
    category: 'Administrativo',
    tree: [
      {
        title: 'Agotamiento de la vía administrativa',
        kind: 'Fase',
        offsetDays: 0,
        children: [
          {
            title: 'Recurso impugnativo / silencio administrativo',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 15,
            triggers: officeLeafTriggers('ca-agot'),
          },
        ],
      },
      {
        title: 'Demanda',
        kind: 'Fase',
        offsetDays: 20,
        children: [
          {
            title: 'Demanda contenciosa',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 25,
            triggers: judicialLeafTriggers('ca-dem'),
          },
        ],
      },
      {
        title: 'Auto admisorio y contestación',
        kind: 'Fase',
        offsetDays: 35,
        children: [
          {
            title: 'Traslado y contestación de la entidad',
            kind: 'Diligencia',
            offsetDays: 50,
            triggers: judicialLeafTriggers('ca-cont'),
          },
        ],
      },
      {
        title: 'Saneamiento y pruebas',
        kind: 'Fase',
        offsetDays: 60,
        children: [
          {
            title: 'Audiencia de pruebas',
            kind: 'Audiencia',
            actionType: ActionType.SCHEDULE_HEARING,
            offsetDays: 80,
            triggers: judicialLeafTriggers('ca-prueb'),
          },
        ],
      },
      {
        title: 'Sentencia y apelación',
        kind: 'Fase',
        offsetDays: 100,
        children: [
          {
            title: 'Sentencia de primer grado',
            kind: 'Diligencia',
            actionType: ActionType.NOTIFY_PARTY,
            offsetDays: 110,
            triggers: judicialLeafTriggers('ca-sent'),
          },
          {
            title: 'Apelación ante Sala Superior',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 120,
            triggers: judicialLeafTriggers('ca-apela'),
          },
        ],
      },
    ],
  },
  {
    name: 'Reclamación tributaria (SUNAT → Tribunal Fiscal)',
    description:
      'Código Tributario (D.S. 133-2013-EF): reclamación ante SUNAT, apelación al Tribunal Fiscal y, si procede, proceso contencioso-administrativo.',
    matterType: MatterType.TAX,
    category: 'Tributario',
    tree: [
      {
        title: 'Reclamación ante SUNAT',
        kind: 'Fase',
        offsetDays: 0,
        children: [
          {
            title: 'Presentación de reclamación',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 7,
            triggers: officeLeafTriggers('rt-rec'),
          },
        ],
      },
      {
        title: 'Resolución de SUNAT',
        kind: 'Fase',
        offsetDays: 60,
        children: [
          {
            title: 'Análisis de resolución',
            kind: 'Diligencia',
            offsetDays: 75,
            triggers: officeLeafTriggers('rt-res'),
          },
        ],
      },
      {
        title: 'Apelación al Tribunal Fiscal',
        kind: 'Fase',
        offsetDays: 80,
        children: [
          {
            title: 'Recurso de apelación',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 90,
            triggers: officeLeafTriggers('rt-tf'),
          },
        ],
      },
      {
        title: 'Demanda contencioso-administrativa (si procede)',
        kind: 'Fase',
        offsetDays: 120,
        children: [
          {
            title: 'Demanda ante el Poder Judicial',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 135,
            triggers: judicialLeafTriggers('rt-pj'),
          },
        ],
      },
    ],
  },
  {
    name: 'INDECOPI — procedimiento sancionador (consumidor)',
    description:
      'Ley 29571 (Código de Protección al Consumidor): denuncia, admisión, descargos, audiencia y resolución; apelación ante Sala Especializada.',
    matterType: MatterType.ADMINISTRATIVE,
    category: 'Consumo',
    tree: [
      {
        title: 'Denuncia',
        kind: 'Fase',
        offsetDays: 0,
        children: [
          {
            title: 'Presentación de denuncia',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 5,
            triggers: officeLeafTriggers('idc-den'),
          },
        ],
      },
      {
        title: 'Admisión e investigación',
        kind: 'Fase',
        offsetDays: 15,
        children: [
          {
            title: 'Descargos del proveedor',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 35,
            triggers: officeLeafTriggers('idc-desc'),
          },
        ],
      },
      {
        title: 'Audiencia',
        kind: 'Fase',
        offsetDays: 45,
        children: [
          {
            title: 'Audiencia de conciliación / prueba',
            kind: 'Audiencia',
            actionType: ActionType.SCHEDULE_HEARING,
            offsetDays: 55,
            triggers: officeLeafTriggers('idc-aud'),
          },
        ],
      },
      {
        title: 'Resolución y apelación',
        kind: 'Fase',
        offsetDays: 70,
        children: [
          {
            title: 'Resolución de primera instancia',
            kind: 'Diligencia',
            offsetDays: 85,
            triggers: officeLeafTriggers('idc-res'),
          },
          {
            title: 'Apelación a Sala Especializada',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 95,
            triggers: officeLeafTriggers('idc-apela'),
          },
        ],
      },
    ],
  },
  {
    name: 'Proceso penal inmediato',
    description:
      'NCPP (D.L. 957) arts. 446-448: procedimiento inmediato para delitos sancionados con pena no mayor de 4 años.',
    matterType: MatterType.CRIMINAL,
    category: 'Penal',
    tree: [
      {
        title: 'Investigación e incoación',
        kind: 'Fase',
        offsetDays: 0,
        children: [
          {
            title: 'Audiencia única de incoación',
            kind: 'Audiencia',
            actionType: ActionType.SCHEDULE_HEARING,
            offsetDays: 15,
            triggers: judicialLeafTriggers('ppi-inc'),
          },
        ],
      },
      {
        title: 'Acusación y juicio inmediato',
        kind: 'Fase',
        offsetDays: 25,
        children: [
          {
            title: 'Audiencia de juicio inmediato',
            kind: 'Audiencia',
            actionType: ActionType.SCHEDULE_HEARING,
            offsetDays: 40,
            triggers: judicialLeafTriggers('ppi-juicio'),
          },
        ],
      },
      {
        title: 'Sentencia y apelación',
        kind: 'Fase',
        offsetDays: 50,
        children: [
          {
            title: 'Sentencia',
            kind: 'Diligencia',
            offsetDays: 55,
            triggers: judicialLeafTriggers('ppi-sent'),
          },
          {
            title: 'Apelación',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 65,
            triggers: judicialLeafTriggers('ppi-apela'),
          },
        ],
      },
    ],
  },
  {
    name: 'Proceso penal común',
    description:
      'NCPP (D.L. 957): investigación preliminar, formalización, investigación preparatoria, etapa intermedia, juicio oral, sentencia, apelación y casación.',
    matterType: MatterType.CRIMINAL,
    category: 'Penal',
    tree: [
      {
        title: 'Investigación preliminar',
        kind: 'Fase',
        offsetDays: 0,
        children: [
          {
            title: 'Actuaciones preliminares',
            kind: 'Diligencia',
            offsetDays: 30,
            triggers: judicialLeafTriggers('ppc-ip'),
          },
        ],
      },
      {
        title: 'Formalización',
        kind: 'Fase',
        offsetDays: 35,
        children: [
          {
            title: 'Audiencia de formalización',
            kind: 'Audiencia',
            actionType: ActionType.SCHEDULE_HEARING,
            offsetDays: 40,
            triggers: judicialLeafTriggers('ppc-form'),
          },
        ],
      },
      {
        title: 'Investigación preparatoria',
        kind: 'Fase',
        offsetDays: 50,
        children: [
          {
            title: 'Diligencias y declaraciones',
            kind: 'Diligencia',
            offsetDays: 90,
            triggers: judicialLeafTriggers('ppc-prep'),
          },
        ],
      },
      {
        title: 'Etapa intermedia',
        kind: 'Fase',
        offsetDays: 120,
        children: [
          {
            title: 'Audiencia de control de acusación',
            kind: 'Audiencia',
            actionType: ActionType.SCHEDULE_HEARING,
            offsetDays: 130,
            triggers: judicialLeafTriggers('ppc-inter'),
          },
        ],
      },
      {
        title: 'Juicio oral',
        kind: 'Fase',
        offsetDays: 150,
        children: [
          {
            title: 'Juicio oral público',
            kind: 'Audiencia',
            actionType: ActionType.SCHEDULE_HEARING,
            offsetDays: 160,
            triggers: judicialLeafTriggers('ppc-jo'),
          },
        ],
      },
      {
        title: 'Sentencia y recursos',
        kind: 'Fase',
        offsetDays: 180,
        children: [
          {
            title: 'Sentencia',
            kind: 'Diligencia',
            offsetDays: 185,
            triggers: judicialLeafTriggers('ppc-sent'),
          },
          {
            title: 'Apelación y casación',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 200,
            triggers: judicialLeafTriggers('ppc-rec'),
          },
        ],
      },
    ],
  },
  {
    name: 'Arbitraje comercial nacional',
    description:
      'Ley de Arbitraje (D.L. 1071): solicitud, constitución del tribunal, audiencias, laudo y anulación ante la Corte Superior.',
    matterType: MatterType.ADVISORY,
    category: 'Arbitraje',
    tree: [
      {
        title: 'Solicitud y respuesta',
        kind: 'Fase',
        offsetDays: 0,
        children: [
          {
            title: 'Solicitud de arbitraje y designación',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 10,
            triggers: officeLeafTriggers('arb-sol'),
          },
        ],
      },
      {
        title: 'Constitución del tribunal',
        kind: 'Fase',
        offsetDays: 20,
        children: [
          {
            title: 'Acta de instalación del tribunal arbitral',
            kind: 'Diligencia',
            offsetDays: 30,
            triggers: officeLeafTriggers('arb-const'),
          },
        ],
      },
      {
        title: 'Demanda arbitral y contestación',
        kind: 'Fase',
        offsetDays: 35,
        children: [
          {
            title: 'Demanda y contestación en arbitraje',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 50,
            triggers: officeLeafTriggers('arb-dem'),
          },
        ],
      },
      {
        title: 'Audiencias y laudo',
        kind: 'Fase',
        offsetDays: 60,
        children: [
          {
            title: 'Audiencias y cierre de instrucción',
            kind: 'Audiencia',
            actionType: ActionType.SCHEDULE_HEARING,
            offsetDays: 90,
            triggers: officeLeafTriggers('arb-aud'),
          },
          {
            title: 'Laudo arbitral',
            kind: 'Entregable',
            actionType: ActionType.DOC_CREATION,
            offsetDays: 120,
            triggers: officeLeafTriggers('arb-laudo'),
          },
        ],
      },
      {
        title: 'Anulación (Corte Superior)',
        kind: 'Fase',
        offsetDays: 130,
        children: [
          {
            title: 'Demanda de anulación de laudo',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 145,
            triggers: judicialLeafTriggers('arb-anul'),
          },
        ],
      },
    ],
  },
  {
    name: 'Despido arbitrario (reposición o indemnización)',
    description:
      'D.S. 003-97-TR (LPCL) y NLPT: proceso abreviado laboral; pretensiones según precedentes constitucionales (reposición / indemnización).',
    matterType: MatterType.LABOR,
    category: 'Contencioso laboral',
    tree: [
      {
        title: 'Estrategia y pretensiones',
        kind: 'Fase',
        offsetDays: 0,
        children: [
          {
            title: 'Definición de pretensión (reposición / indemnización)',
            kind: 'Diligencia',
            offsetDays: 3,
            triggers: officeLeafTriggers('da-estr'),
          },
        ],
      },
      {
        title: 'Demanda (proceso abreviado)',
        kind: 'Fase',
        offsetDays: 7,
        children: [
          {
            title: 'Demanda por despido arbitrario',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 12,
            triggers: judicialLeafTriggers('da-dem'),
          },
        ],
      },
      {
        title: 'Audiencia única (NLPT abreviado)',
        kind: 'Fase',
        offsetDays: 35,
        children: [
          {
            title: 'Audiencia única y sentencia',
            kind: 'Audiencia',
            actionType: ActionType.SCHEDULE_HEARING,
            offsetDays: 45,
            triggers: judicialLeafTriggers('da-aud'),
          },
        ],
      },
      {
        title: 'Recursos',
        kind: 'Fase',
        offsetDays: 60,
        children: [
          {
            title: 'Apelación / casación',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 70,
            triggers: judicialLeafTriggers('da-rec'),
          },
        ],
      },
    ],
  },
  {
    name: 'Hostigamiento sexual laboral',
    description:
      'Ley 27942 y Reglamento (D.S. 014-2019-MIMP): queja, medidas de protección, investigación, informe y decisión con recursos.',
    matterType: MatterType.LABOR,
    category: 'Laboral preventivo',
    tree: [
      {
        title: 'Queja',
        kind: 'Fase',
        offsetDays: 0,
        children: [
          {
            title: 'Presentación de queja',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 3,
            triggers: officeLeafTriggers('hs-queja'),
          },
        ],
      },
      {
        title: 'Medidas de protección',
        kind: 'Fase',
        offsetDays: 10,
        children: [
          {
            title: 'Implementación de medidas provisionales',
            kind: 'Diligencia',
            offsetDays: 15,
            triggers: officeLeafTriggers('hs-med'),
          },
        ],
      },
      {
        title: 'Investigación e informe',
        kind: 'Fase',
        offsetDays: 20,
        children: [
          {
            title: 'Informe de investigación interna',
            kind: 'Entregable',
            actionType: ActionType.DOC_CREATION,
            offsetDays: 40,
            triggers: officeLeafTriggers('hs-inf'),
          },
        ],
      },
      {
        title: 'Decisión y recursos',
        kind: 'Fase',
        offsetDays: 45,
        children: [
          {
            title: 'Sanción o archivo y recursos',
            kind: 'Diligencia',
            offsetDays: 55,
            triggers: officeLeafTriggers('hs-dec'),
          },
        ],
      },
    ],
  },
  {
    name: 'Habeas corpus',
    description:
      'Ley 31307: hábeas corpus (arts. 33-46); investigación sumaria, resolución, apelación y RAC ante el TC.',
    matterType: MatterType.LITIGATION,
    category: 'Constitucional',
    tree: [
      {
        title: 'Demanda',
        kind: 'Fase',
        children: [
          {
            title: 'Presentación de hábeas corpus',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 1,
            triggers: judicialLeafTriggers('hc-dem'),
          },
        ],
      },
      {
        title: 'Investigación sumaria',
        kind: 'Fase',
        offsetDays: 1,
        children: [
          {
            title: 'Diligencias urgentes (plazo 24h)',
            kind: 'Diligencia',
            offsetDays: 2,
            triggers: judicialLeafTriggers('hc-inv'),
          },
        ],
      },
      {
        title: 'Resolución y recursos',
        kind: 'Fase',
        offsetDays: 3,
        children: [
          {
            title: 'Resolución de primer grado',
            kind: 'Diligencia',
            actionType: ActionType.NOTIFY_PARTY,
            offsetDays: 5,
            triggers: judicialLeafTriggers('hc-sent'),
          },
          {
            title: 'Apelación y RAC',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 10,
            triggers: judicialLeafTriggers('hc-rac'),
          },
        ],
      },
    ],
  },
  {
    name: 'Sucesión intestada notarial',
    description:
      'Ley 26662: sucesión intestada ante notario (arts. 38-43); publicaciones, plazo de 15 días, protocolización e inscripción registral.',
    matterType: MatterType.FAMILY,
    category: 'Sucesiones',
    tree: [
      {
        title: 'Solicitud y expediente',
        kind: 'Fase',
        offsetDays: 0,
        children: [
          {
            title: 'Inicio de expediente notarial',
            kind: 'Diligencia',
            offsetDays: 5,
            triggers: officeLeafTriggers('suc-exp'),
          },
        ],
      },
      {
        title: 'Publicaciones',
        kind: 'Fase',
        offsetDays: 10,
        children: [
          {
            title: 'Publicación en El Peruano y diario local',
            kind: 'Diligencia',
            actionType: ActionType.NOTIFICATION,
            offsetDays: 20,
            triggers: officeLeafTriggers('suc-pub'),
          },
        ],
      },
      {
        title: 'Espera de 15 días',
        kind: 'Fase',
        offsetDays: 25,
        children: [
          {
            title: 'Control de plazo y oposiciones',
            kind: 'Hito',
            offsetDays: 40,
            triggers: officeLeafTriggers('suc-plazo'),
          },
        ],
      },
      {
        title: 'Protocolización e inscripción',
        kind: 'Fase',
        offsetDays: 45,
        children: [
          {
            title: 'Minuta notarial e inscripción SUNARP',
            kind: 'Diligencia',
            offsetDays: 55,
            triggers: officeLeafTriggers('suc-ins'),
          },
        ],
      },
    ],
  },
  {
    name: 'Licitación pública (postor)',
    description:
      'Ley 30225 y Reglamento (D.S. 344-2018-EF): registro SEACE, consultas, ofertas, evaluación, buena pro y contrato.',
    matterType: MatterType.ADVISORY,
    category: 'Contratación pública',
    tree: [
      {
        title: 'Registro y habilitación',
        kind: 'Fase',
        offsetDays: 0,
        children: [
          {
            title: 'Registro de proveedor',
            kind: 'Diligencia',
            actionType: ActionType.EXTERNAL_CHECK,
            offsetDays: 3,
            triggers: officeLeafTriggers('lic-reg'),
          },
        ],
      },
      {
        title: 'Consultas y observaciones',
        kind: 'Fase',
        offsetDays: 5,
        children: [
          {
            title: 'Consultas a bases',
            kind: 'Diligencia',
            offsetDays: 12,
            triggers: officeLeafTriggers('lic-cons'),
          },
        ],
      },
      {
        title: 'Oferta',
        kind: 'Fase',
        offsetDays: 18,
        children: [
          {
            title: 'Preparación y presentación de oferta',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 28,
            triggers: officeLeafTriggers('lic-oferta'),
          },
        ],
      },
      {
        title: 'Evaluación y buena pro',
        kind: 'Fase',
        offsetDays: 32,
        children: [
          {
            title: 'Sustentación y evaluación',
            kind: 'Audiencia',
            actionType: ActionType.SCHEDULE_HEARING,
            offsetDays: 42,
            triggers: officeLeafTriggers('lic-eval'),
          },
        ],
      },
      {
        title: 'Perfeccionamiento del contrato',
        kind: 'Fase',
        offsetDays: 48,
        children: [
          {
            title: 'Firma del contrato estatal',
            kind: 'Diligencia',
            actionType: ActionType.APPROVAL,
            offsetDays: 55,
            triggers: officeLeafTriggers('lic-cont'),
          },
        ],
      },
    ],
  },
  {
    name: 'PAD disciplinario (SERVIR)',
    description:
      'Ley 30057 y Reglamento (D.S. 040-2014-PCM): denuncia, inicio de PAD, descargos, informe oral, sanción y apelación al Tribunal del SERVIR.',
    matterType: MatterType.ADMINISTRATIVE,
    category: 'Empleo público',
    tree: [
      {
        title: 'Denuncia y admisión',
        kind: 'Fase',
        offsetDays: 0,
        children: [
          {
            title: 'Denuncia o informe de irregularidad',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 7,
            triggers: officeLeafTriggers('pad-den'),
          },
        ],
      },
      {
        title: 'Inicio del PAD',
        kind: 'Fase',
        offsetDays: 20,
        children: [
          {
            title: 'Notificación de cargos e inicio formal',
            kind: 'Diligencia',
            actionType: ActionType.NOTIFY_PARTY,
            offsetDays: 25,
            triggers: officeLeafTriggers('pad-ini'),
          },
        ],
      },
      {
        title: 'Descargos e informe oral',
        kind: 'Fase',
        offsetDays: 35,
        children: [
          {
            title: 'Descargos del servidor',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 50,
            triggers: officeLeafTriggers('pad-desc'),
          },
          {
            title: 'Informe oral / audiencia',
            kind: 'Audiencia',
            actionType: ActionType.SCHEDULE_HEARING,
            offsetDays: 65,
            triggers: officeLeafTriggers('pad-aud'),
          },
        ],
      },
      {
        title: 'Resolución y apelación',
        kind: 'Fase',
        offsetDays: 75,
        children: [
          {
            title: 'Resolución sancionadora',
            kind: 'Diligencia',
            offsetDays: 85,
            triggers: officeLeafTriggers('pad-res'),
          },
          {
            title: 'Apelación al Tribunal del SERVIR',
            kind: 'Escrito',
            actionType: ActionType.FILE_BRIEF,
            offsetDays: 95,
            triggers: officeLeafTriggers('pad-apela'),
          },
        ],
      },
    ],
  },
];

export async function seedLegalSystemTemplates(em: EntityManager): Promise<void> {
  const stats: SeedStats = { created: 0, replaced: 0, versioned: 0, skipped: 0 };
  for (const def of TEMPLATES) {
    await upsertSystemTemplate(em, def, stats);
  }
  await em.flush();
  console.log(
    `Legal system templates: created=${stats.created} replaced=${stats.replaced} versioned=${stats.versioned} skipped=${stats.skipped} (total defs=${TEMPLATES.length})`,
  );
}
