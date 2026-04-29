import { ref, computed } from 'vue';

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------
export type ActivityCategory =
  | 'expediente'
  | 'documento'
  | 'cliente'
  | 'parte'
  | 'auth'
  | 'workflow';
export type ActivityKind =
  | 'create'
  | 'update'
  | 'archive'
  | 'restore'
  | 'delete'
  | 'login'
  | 'logout'
  | 'transition'
  | 'comment';

export interface MockActor {
  id: string;
  name: string;
  initials: string;
  email: string;
}

export interface MockActivityEvent {
  id: string;
  timestamp: string; // ISO
  category: ActivityCategory;
  kind: ActivityKind;
  actor: MockActor;
  /** Sentence describing the change in past tense */
  summary: string;
  /** Linked entity title for ContextLink, e.g. expediente title */
  contextLabel?: string;
  /** Optional inline diff or extra detail to show on expand */
  detail?: string;
}

// -----------------------------------------------------------------------
// Static data
// -----------------------------------------------------------------------
export const MOCK_ACTORS: MockActor[] = [
  { id: 'u1', name: 'Carlos Mendoza', initials: 'CM', email: 'carlos@alega.pe' },
  { id: 'u2', name: 'Ana Torres', initials: 'AT', email: 'ana@alega.pe' },
  { id: 'u3', name: 'Luis Paredes', initials: 'LP', email: 'luis@alega.pe' },
  { id: 'u4', name: 'Sofia Vega', initials: 'SV', email: 'sofia@alega.pe' },
  { id: 'system', name: 'Sistema', initials: 'SY', email: 'system@alega.pe' },
];

export const ACTIVITY_CATEGORIES: { label: string; value: ActivityCategory | null }[] = [
  { label: 'Todas las categorías', value: null },
  { label: 'Expedientes', value: 'expediente' },
  { label: 'Documentos', value: 'documento' },
  { label: 'Clientes', value: 'cliente' },
  { label: 'Partes', value: 'parte' },
  { label: 'Workflow', value: 'workflow' },
  { label: 'Autenticación', value: 'auth' },
];

export const categoryLabel: Record<ActivityCategory, string> = {
  expediente: 'Expediente',
  documento: 'Documento',
  cliente: 'Cliente',
  parte: 'Parte',
  auth: 'Autenticación',
  workflow: 'Workflow',
};

export const categorySeverity: Record<ActivityCategory, 'info' | 'warn' | 'success' | 'secondary'> = {
  expediente: 'info',
  documento: 'success',
  cliente: 'warn',
  parte: 'secondary',
  auth: 'secondary',
  workflow: 'info',
};

export const kindLabel: Record<ActivityKind, string> = {
  create: 'Creó',
  update: 'Actualizó',
  archive: 'Archivó',
  restore: 'Restauró',
  delete: 'Eliminó',
  login: 'Inició sesión',
  logout: 'Cerró sesión',
  transition: 'Cambió de estado',
  comment: 'Comentó',
};

export const kindIcon: Record<ActivityKind, string> = {
  create: 'pi pi-plus',
  update: 'pi pi-pencil',
  archive: 'pi pi-inbox',
  restore: 'pi pi-replay',
  delete: 'pi pi-trash',
  login: 'pi pi-sign-in',
  logout: 'pi pi-sign-out',
  transition: 'pi pi-arrow-right-arrow-left',
  comment: 'pi pi-comment',
};

export const kindAccentColor: Record<ActivityKind, string> = {
  create: '#10b981',
  update: '#2563eb',
  archive: '#d97706',
  restore: '#0d9488',
  delete: '#dc2626',
  login: '#64748b',
  logout: '#64748b',
  transition: '#7c3aed',
  comment: '#0ea5e9',
};

export function actorAvatarColor(id: string): string {
  if (id === 'system') return '#64748b';
  const colors = ['#3b5bdb', '#0ca678', '#e67700', '#862e9c'];
  return colors[id.codePointAt(id.length - 1)! % colors.length];
}

export function formatActivityDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
  const time = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

// -----------------------------------------------------------------------
// Mock dataset (~50 events spread over last week)
// -----------------------------------------------------------------------
const NOW = Date.now();
const minutesAgo = (m: number) => new Date(NOW - m * 60 * 1000).toISOString();

const ACTOR = (id: string): MockActor => MOCK_ACTORS.find((a) => a.id === id)!;

const RAW: MockActivityEvent[] = [
  {
    id: 'a-1',
    timestamp: minutesAgo(5),
    category: 'expediente',
    kind: 'create',
    actor: ACTOR('u1'),
    summary: 'creó el expediente',
    contextLabel: 'Pérez vs. Constructora Andina',
  },
  {
    id: 'a-2',
    timestamp: minutesAgo(18),
    category: 'documento',
    kind: 'update',
    actor: ACTOR('u2'),
    summary: 'subió una nueva versión de',
    contextLabel: 'Contrato_servicios_v3.pdf',
    detail: 'v2 → v3 · firmado por la contraparte',
  },
  {
    id: 'a-3',
    timestamp: minutesAgo(32),
    category: 'workflow',
    kind: 'transition',
    actor: ACTOR('u3'),
    summary: 'cambió la etapa de',
    contextLabel: 'García vs. Municipalidad',
    detail: 'Demanda → Contestación',
  },
  {
    id: 'a-4',
    timestamp: minutesAgo(47),
    category: 'expediente',
    kind: 'archive',
    actor: ACTOR('u4'),
    summary: 'archivó el expediente',
    contextLabel: 'Conflicto laboral 2023-15',
  },
  {
    id: 'a-5',
    timestamp: minutesAgo(60),
    category: 'cliente',
    kind: 'create',
    actor: ACTOR('u1'),
    summary: 'creó el cliente',
    contextLabel: 'Inversiones Pacífico S.A.C.',
  },
  {
    id: 'a-6',
    timestamp: minutesAgo(85),
    category: 'parte',
    kind: 'create',
    actor: ACTOR('u2'),
    summary: 'agregó una parte a',
    contextLabel: 'Pérez vs. Constructora Andina',
    detail: 'María Gómez (Tercero)',
  },
  {
    id: 'a-7',
    timestamp: minutesAgo(120),
    category: 'documento',
    kind: 'comment',
    actor: ACTOR('u3'),
    summary: 'comentó en',
    contextLabel: 'Demanda inicial.docx',
    detail: '"Revisar puntos 3 y 4 antes del envío"',
  },
  {
    id: 'a-8',
    timestamp: minutesAgo(140),
    category: 'auth',
    kind: 'login',
    actor: ACTOR('u4'),
    summary: 'inició sesión desde',
    contextLabel: 'Lima, Perú · Chrome 134',
  },
  {
    id: 'a-9',
    timestamp: minutesAgo(180),
    category: 'documento',
    kind: 'create',
    actor: ACTOR('u1'),
    summary: 'subió el documento',
    contextLabel: 'Memorial alegatos.pdf',
  },
  {
    id: 'a-10',
    timestamp: minutesAgo(220),
    category: 'expediente',
    kind: 'update',
    actor: ACTOR('u2'),
    summary: 'actualizó el responsable de',
    contextLabel: 'Textiles del Sur — Despido masivo',
    detail: 'Sofia Vega → Carlos Mendoza',
  },
  {
    id: 'a-11',
    timestamp: minutesAgo(280),
    category: 'cliente',
    kind: 'archive',
    actor: ACTOR('u3'),
    summary: 'archivó el cliente',
    contextLabel: 'Antigua Cía. Constructora S.A.',
  },
  {
    id: 'a-12',
    timestamp: minutesAgo(320),
    category: 'documento',
    kind: 'delete',
    actor: ACTOR('u4'),
    summary: 'eliminó permanentemente',
    contextLabel: 'borrador-v0.docx',
  },
  {
    id: 'a-13',
    timestamp: minutesAgo(400),
    category: 'workflow',
    kind: 'transition',
    actor: ACTOR('u1'),
    summary: 'cerró la etapa de',
    contextLabel: 'Divorcio Quispe',
    detail: 'Audiencia conciliatoria → Sentencia',
  },
  {
    id: 'a-14',
    timestamp: minutesAgo(460),
    category: 'auth',
    kind: 'login',
    actor: ACTOR('u2'),
    summary: 'inició sesión desde',
    contextLabel: 'Arequipa, Perú · Safari 18',
  },
  {
    id: 'a-15',
    timestamp: minutesAgo(540),
    category: 'expediente',
    kind: 'restore',
    actor: ACTOR('u3'),
    summary: 'reactivó el expediente',
    contextLabel: 'Caso Vásquez 2023',
  },
  {
    id: 'a-16',
    timestamp: minutesAgo(620),
    category: 'documento',
    kind: 'update',
    actor: ACTOR('u4'),
    summary: 'firmó digitalmente',
    contextLabel: 'Contrato_marco_v2.pdf',
  },
  {
    id: 'a-17',
    timestamp: minutesAgo(720),
    category: 'parte',
    kind: 'update',
    actor: ACTOR('u1'),
    summary: 'actualizó datos de contacto de',
    contextLabel: 'Juan Pérez Rodríguez',
    detail: 'Email: jperez@old.com → jperez@correo.com',
  },
  {
    id: 'a-18',
    timestamp: minutesAgo(840),
    category: 'cliente',
    kind: 'update',
    actor: ACTOR('u2'),
    summary: 'verificó la información de',
    contextLabel: 'Grupo Andino S.A.C.',
  },
  {
    id: 'a-19',
    timestamp: minutesAgo(960),
    category: 'workflow',
    kind: 'comment',
    actor: ACTOR('system'),
    summary: 'notificó automáticamente sobre',
    contextLabel: 'Plazo vencido en García vs. Municipalidad',
    detail: 'Notificado a Carlos Mendoza por email',
  },
  {
    id: 'a-20',
    timestamp: minutesAgo(1100),
    category: 'auth',
    kind: 'logout',
    actor: ACTOR('u3'),
    summary: 'cerró sesión',
  },
  {
    id: 'a-21',
    timestamp: minutesAgo(1300),
    category: 'expediente',
    kind: 'create',
    actor: ACTOR('u1'),
    summary: 'creó el expediente',
    contextLabel: 'Demanda laboral colectiva — Textiles del Sur',
  },
  {
    id: 'a-22',
    timestamp: minutesAgo(1500),
    category: 'documento',
    kind: 'archive',
    actor: ACTOR('u2'),
    summary: 'archivó',
    contextLabel: 'Versiones obsoletas (8 archivos)',
    detail: '8 archivos movidos a la papelera del expediente',
  },
  {
    id: 'a-23',
    timestamp: minutesAgo(1700),
    category: 'parte',
    kind: 'delete',
    actor: ACTOR('u4'),
    summary: 'eliminó una parte de',
    contextLabel: 'Caso Quispe 2024',
    detail: 'Roberto Salinas (Testigo) — duplicado',
  },
  {
    id: 'a-24',
    timestamp: minutesAgo(1900),
    category: 'workflow',
    kind: 'transition',
    actor: ACTOR('u3'),
    summary: 'avanzó',
    contextLabel: 'Inversiones Pacífico — Demanda',
    detail: 'Calificación → Notificación',
  },
  {
    id: 'a-25',
    timestamp: minutesAgo(2160),
    category: 'auth',
    kind: 'login',
    actor: ACTOR('u1'),
    summary: 'inició sesión desde',
    contextLabel: 'Lima, Perú · Chrome 134',
  },
  {
    id: 'a-26',
    timestamp: minutesAgo(2400),
    category: 'documento',
    kind: 'create',
    actor: ACTOR('u2'),
    summary: 'creó el documento',
    contextLabel: 'Escrito de absolución.docx',
  },
  {
    id: 'a-27',
    timestamp: minutesAgo(2700),
    category: 'cliente',
    kind: 'update',
    actor: ACTOR('u4'),
    summary: 'cambió el responsable de',
    contextLabel: 'Constructora Lima Norte S.A.',
  },
  {
    id: 'a-28',
    timestamp: minutesAgo(3000),
    category: 'expediente',
    kind: 'update',
    actor: ACTOR('u3'),
    summary: 'modificó la fecha límite de',
    contextLabel: 'García vs. Municipalidad',
    detail: '15 may → 22 may',
  },
];

// -----------------------------------------------------------------------
// Composable
// -----------------------------------------------------------------------
export function useMockActivityLog() {
  const events = ref<MockActivityEvent[]>(RAW);
  const total = computed(() => events.value.length);
  return { events, total };
}
