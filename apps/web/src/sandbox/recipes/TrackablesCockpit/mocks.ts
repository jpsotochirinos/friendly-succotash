// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------
export type TrackableScope = 'active' | 'archived' | 'trash';
export type TrackableType = 'caso' | 'proceso' | 'proyecto' | 'auditoria';
export type MatterType = 'litigio' | 'corporativo' | 'familia' | 'laboral' | 'constitucional';

export interface MockUser {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
}

export interface MockClient {
  id: string;
  name: string;
}

export interface MockTemplate {
  id: string;
  name: string;
}

export interface MockTrackable {
  id: string;
  emoji: string;
  title: string;
  caseNumber: string;
  type: TrackableType;
  matterType: MatterType;
  scope: TrackableScope;
  assigneeId: string | null;
  clientId: string | null;
  deadlineDate: string | null;
  documentCount: number;
  eventCount: number;
  noteCount: number;
  isUrgent: boolean;
  isOverdue: boolean;
  createdAt: string;
}

// -----------------------------------------------------------------------
// Static lookup data
// -----------------------------------------------------------------------
export const MOCK_USERS: MockUser[] = [
  { id: 'u1', name: 'Carlos Mendoza', initials: 'CM', avatarColor: '#3b5bdb' },
  { id: 'u2', name: 'Ana Torres', initials: 'AT', avatarColor: '#0ca678' },
  { id: 'u3', name: 'Luis Paredes', initials: 'LP', avatarColor: '#e67700' },
  { id: 'u4', name: 'Sofia Vega', initials: 'SV', avatarColor: '#862e9c' },
];

export const MOCK_CLIENTS: MockClient[] = [
  { id: 'c1', name: 'Grupo Andino S.A.C.' },
  { id: 'c2', name: 'García Hermanos E.I.R.L.' },
  { id: 'c3', name: 'María del Carmen Quispe' },
  { id: 'c4', name: 'Constructora Lima Norte S.A.' },
  { id: 'c5', name: 'Textiles del Sur S.R.L.' },
];

export const MOCK_TEMPLATES: MockTemplate[] = [
  { id: 't1', name: 'Litigio civil estándar' },
  { id: 't2', name: 'Proceso laboral' },
  { id: 't3', name: 'Asesoría corporativa' },
  { id: 't4', name: 'Sin plantilla' },
];

export const STATUS_FILTER_OPTIONS = [
  { label: 'Activos', value: 'active' },
  { label: 'Archivados', value: 'archived' },
  { label: 'Papelera', value: 'trash' },
];

export const TYPE_OPTIONS: { label: string; value: TrackableType }[] = [
  { label: 'Caso', value: 'caso' },
  { label: 'Proceso', value: 'proceso' },
  { label: 'Proyecto', value: 'proyecto' },
  { label: 'Auditoría', value: 'auditoria' },
];

export const MATTER_TYPE_OPTIONS: { label: string; value: MatterType }[] = [
  { label: 'Litigio', value: 'litigio' },
  { label: 'Corporativo', value: 'corporativo' },
  { label: 'Familia', value: 'familia' },
  { label: 'Laboral', value: 'laboral' },
  { label: 'Constitucional', value: 'constitucional' },
];

// -----------------------------------------------------------------------
// Label & severity helpers
// -----------------------------------------------------------------------
export const typeLabel: Record<TrackableType, string> = {
  caso: 'Caso',
  proceso: 'Proceso',
  proyecto: 'Proyecto',
  auditoria: 'Auditoría',
};

export const typeSeverity: Record<TrackableType, 'info' | 'warn' | 'success' | 'secondary'> = {
  caso: 'info',
  proceso: 'warn',
  proyecto: 'success',
  auditoria: 'secondary',
};

export const matterTypeLabel: Record<MatterType, string> = {
  litigio: 'Litigio',
  corporativo: 'Corporativo',
  familia: 'Familia',
  laboral: 'Laboral',
  constitucional: 'Constitucional',
};

export function statusLabel(scope: TrackableScope): string {
  return { active: 'Activo', archived: 'Archivado', trash: 'Papelera' }[scope];
}

export function statusSeverity(scope: TrackableScope): 'success' | 'warn' | 'danger' {
  return { active: 'success', archived: 'warn', trash: 'danger' }[scope] as 'success' | 'warn' | 'danger';
}

export function getAssignee(id: string | null): MockUser | undefined {
  return MOCK_USERS.find((u) => u.id === id);
}

export function getClient(id: string | null): MockClient | undefined {
  return MOCK_CLIENTS.find((c) => c.id === id);
}

// -----------------------------------------------------------------------
// Mock dataset generator (deterministic — stress virtual list / scroll)
// -----------------------------------------------------------------------
/** Target size for the active sandbox pool (7 hand-crafted + N generated). */
export const SANDBOX_ACTIVE_DETERMINISTIC_ROWS = 50;

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateMockTrackablesDeterministic(count: number, seed = 0x414c4547): Omit<MockTrackable, 'scope'>[] {
  const rand = mulberry32(seed);
  const emojis = ['⚖️', '🏢', '👨‍👩‍👧', '🏗️', '⚠️', '📋', '🏛️', '📁', '📂', '🗑️', '💼', '📜', '👔', '🔏', '✍️'];
  const types: TrackableType[] = ['caso', 'proceso', 'proyecto', 'auditoria'];
  const matterTypes: MatterType[] = ['litigio', 'corporativo', 'familia', 'laboral', 'constitucional'];
  const userIds = ['u1', 'u2', 'u3', 'u4', null];
  const clientIds = ['c1', 'c2', 'c3', 'c4', 'c5', null];
  const surnames = ['García', 'López', 'Martínez', 'González', 'Rodríguez', 'Pérez', 'Hernández', 'Jiménez', 'Sánchez', 'Díaz', 'Quispe', 'Vásquez', 'Torres', 'Mendoza', 'Paredes'];
  const subjects = ['vs. Municipalidad', 'vs. SUNAT', '— Contrato', '— Demanda', '— Amparo', '— Divorcio', '— Despido', '— Herencia', '— Conflicto', '— Due Diligence', '— Auditoría', '— Cumplimiento', '— Fusión', '— Reclamo', '— Nulidad'];

  const items: Omit<MockTrackable, 'scope'>[] = [];
  for (let i = 1; i <= count; i++) {
    const type = types[Math.floor(rand() * types.length)];
    const matterType = matterTypes[Math.floor(rand() * matterTypes.length)];
    const deadlineOffset = Math.floor(rand() * 90) - 15;
    const createdDaysAgo = Math.floor(rand() * 365);
    const surname = surnames[Math.floor(rand() * surnames.length)];
    const subject = subjects[Math.floor(rand() * subjects.length)];
    const title = `${surname} ${subject} (#${i})`;
    const year = 2024;
    const courtCode = String(Math.floor(rand() * 1900) + 1).padStart(5, '0');
    const caseNumber =
      type === 'caso' || type === 'proceso'
        ? `${courtCode}-${year}-0-1801-JR-${type === 'caso' ? 'CI' : 'LA'}-${String(Math.floor(rand() * 10) + 1).padStart(2, '0')}`
        : type === 'proyecto'
          ? `CORP-${year}-${String(Math.floor(rand() * 1000)).padStart(4, '0')}`
          : `AUD-${year}-${String(Math.floor(rand() * 100)).padStart(4, '0')}`;
    const deadlineDate =
      deadlineOffset === null
        ? null
        : new Date(Date.now() + deadlineOffset * 24 * 3600 * 1000).toISOString().split('T')[0];
    const isOverdue = deadlineDate ? new Date(deadlineDate) < new Date() : false;
    const isUrgent = rand() < 0.15;
    items.push({
      id: `tk-d${String(i).padStart(5, '0')}`,
      emoji: emojis[Math.floor(rand() * emojis.length)],
      title,
      caseNumber,
      type,
      matterType,
      assigneeId: userIds[Math.floor(rand() * userIds.length)] as string | null,
      clientId: clientIds[Math.floor(rand() * clientIds.length)] as string | null,
      deadlineDate,
      documentCount: Math.floor(rand() * 50),
      eventCount: Math.floor(rand() * 15),
      noteCount: Math.floor(rand() * 10),
      isUrgent,
      isOverdue,
      createdAt: new Date(Date.now() - createdDaysAgo * 24 * 3600 * 1000).toISOString().split('T')[0],
    });
  }
  return items;
}

const BASE_ACTIVE: Omit<MockTrackable, 'scope'>[] = [
  {
    id: 'tk-001',
    emoji: '⚖️',
    title: 'García vs. Municipalidad de Lima',
    caseNumber: '01234-2024-0-1801-JR-CI-05',
    type: 'proceso',
    matterType: 'litigio',
    assigneeId: 'u1',
    clientId: 'c2',
    deadlineDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
    documentCount: 14,
    eventCount: 6,
    noteCount: 3,
    isUrgent: true,
    isOverdue: false,
    createdAt: '2024-02-10',
  },
  {
    id: 'tk-002',
    emoji: '🏢',
    title: 'Fusión Grupo Andino — Due Diligence',
    caseNumber: 'CORP-2024-0112',
    type: 'proyecto',
    matterType: 'corporativo',
    assigneeId: 'u2',
    clientId: 'c1',
    deadlineDate: new Date(Date.now() + 18 * 24 * 3600 * 1000).toISOString().split('T')[0],
    documentCount: 38,
    eventCount: 12,
    noteCount: 7,
    isUrgent: false,
    isOverdue: false,
    createdAt: '2024-01-15',
  },
  {
    id: 'tk-003',
    emoji: '👨‍👩‍👧',
    title: 'Divorcio Quispe — Régimen de visitas',
    caseNumber: '00567-2024-0-1801-JR-FC-02',
    type: 'caso',
    matterType: 'familia',
    assigneeId: 'u3',
    clientId: 'c3',
    deadlineDate: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
    documentCount: 8,
    eventCount: 4,
    noteCount: 5,
    isUrgent: true,
    isOverdue: true,
    createdAt: '2024-03-01',
  },
  {
    id: 'tk-004',
    emoji: '🏗️',
    title: 'Constructora Lima Norte — Contrato obra',
    caseNumber: 'CORP-2024-0089',
    type: 'proyecto',
    matterType: 'corporativo',
    assigneeId: 'u4',
    clientId: 'c4',
    deadlineDate: null,
    documentCount: 22,
    eventCount: 3,
    noteCount: 1,
    isUrgent: false,
    isOverdue: false,
    createdAt: '2024-01-28',
  },
  {
    id: 'tk-005',
    emoji: '⚠️',
    title: 'Textiles del Sur — Despido masivo',
    caseNumber: '00891-2024-0-1801-JR-LA-01',
    type: 'proceso',
    matterType: 'laboral',
    assigneeId: 'u1',
    clientId: 'c5',
    deadlineDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
    documentCount: 31,
    eventCount: 9,
    noteCount: 4,
    isUrgent: false,
    isOverdue: false,
    createdAt: '2024-02-20',
  },
  {
    id: 'tk-006',
    emoji: '📋',
    title: 'Auditoría patrimonial — Herencia Vásquez',
    caseNumber: 'AUD-2024-0023',
    type: 'auditoria',
    matterType: 'constitucional',
    assigneeId: 'u2',
    clientId: null,
    deadlineDate: null,
    documentCount: 5,
    eventCount: 1,
    noteCount: 2,
    isUrgent: false,
    isOverdue: false,
    createdAt: '2024-03-15',
  },
  {
    id: 'tk-007',
    emoji: '🏛️',
    title: 'Grupo Andino — Amparo tributario',
    caseNumber: '00234-2024-0-1801-JR-CO-03',
    type: 'caso',
    matterType: 'constitucional',
    assigneeId: 'u3',
    clientId: 'c1',
    deadlineDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
    documentCount: 17,
    eventCount: 5,
    noteCount: 8,
    isUrgent: false,
    isOverdue: false,
    createdAt: '2024-02-05',
  },
  ...generateMockTrackablesDeterministic(SANDBOX_ACTIVE_DETERMINISTIC_ROWS - 7),
];

const BASE_ARCHIVED: Omit<MockTrackable, 'scope'>[] = [
  {
    id: 'tk-a01',
    emoji: '📁',
    title: 'Conflicto laboral — ex colaboradores',
    caseNumber: '00123-2023-0-1801-JR-LA-04',
    type: 'proceso',
    matterType: 'laboral',
    assigneeId: 'u1',
    clientId: 'c5',
    deadlineDate: null,
    documentCount: 20,
    eventCount: 8,
    noteCount: 3,
    isUrgent: false,
    isOverdue: false,
    createdAt: '2023-06-10',
  },
  {
    id: 'tk-a02',
    emoji: '📂',
    title: 'Contrato marco — Grupo Andino 2023',
    caseNumber: 'CORP-2023-0201',
    type: 'proyecto',
    matterType: 'corporativo',
    assigneeId: 'u4',
    clientId: 'c1',
    deadlineDate: null,
    documentCount: 45,
    eventCount: 15,
    noteCount: 9,
    isUrgent: false,
    isOverdue: false,
    createdAt: '2023-01-20',
  },
];

const BASE_TRASH: Omit<MockTrackable, 'scope'>[] = [
  {
    id: 'tk-d01',
    emoji: '🗑️',
    title: 'Demanda antigua sin documentos',
    caseNumber: 'BORRADOR-2022-001',
    type: 'caso',
    matterType: 'litigio',
    assigneeId: null,
    clientId: null,
    deadlineDate: null,
    documentCount: 0,
    eventCount: 0,
    noteCount: 0,
    isUrgent: false,
    isOverdue: false,
    createdAt: '2022-11-01',
  },
];

export const INITIAL_TRACKABLES: MockTrackable[] = [
  ...BASE_ACTIVE.map((t) => ({ ...t, scope: 'active' as TrackableScope })),
  ...BASE_ARCHIVED.map((t) => ({ ...t, scope: 'archived' as TrackableScope })),
  ...BASE_TRASH.map((t) => ({ ...t, scope: 'trash' as TrackableScope })),
];

// -----------------------------------------------------------------------
// Composable for mock CRUD operations
// -----------------------------------------------------------------------
import { ref, computed } from 'vue';

export function useMockTrackables() {
  const items = ref<MockTrackable[]>(INITIAL_TRACKABLES.map((t) => ({ ...t })));

  const activeItems = computed(() => items.value.filter((t) => t.scope === 'active'));
  const archivedItems = computed(() => items.value.filter((t) => t.scope === 'archived'));
  const trashItems = computed(() => items.value.filter((t) => t.scope === 'trash'));

  function getById(id: string): MockTrackable | undefined {
    return items.value.find((t) => t.id === id);
  }

  async function archive(id: string): Promise<void> {
    await delay(800);
    const item = items.value.find((t) => t.id === id);
    if (item) item.scope = 'archived';
  }

  async function reactivate(id: string): Promise<void> {
    await delay(800);
    const item = items.value.find((t) => t.id === id);
    if (item) item.scope = 'active';
  }

  async function permanentDelete(id: string): Promise<void> {
    await delay(1000);
    const idx = items.value.findIndex((t) => t.id === id);
    if (idx >= 0) items.value.splice(idx, 1);
  }

  async function create(data: {
    emoji: string;
    title: string;
    type: TrackableType;
    matterType: MatterType;
    assigneeId: string | null;
    clientId: string | null;
    deadlineDate: string | null;
  }): Promise<MockTrackable> {
    await delay(900);
    const newItem: MockTrackable = {
      id: `tk-${Date.now()}`,
      caseNumber: `EXP-${new Date().getFullYear()}-${String(items.value.length + 1).padStart(4, '0')}`,
      documentCount: 0,
      eventCount: 0,
      noteCount: 0,
      isUrgent: false,
      isOverdue: false,
      scope: 'active',
      createdAt: new Date().toISOString().split('T')[0],
      ...data,
    };
    items.value.unshift(newItem);
    return newItem;
  }

  async function update(
    id: string,
    data: Partial<Pick<MockTrackable, 'emoji' | 'title' | 'type' | 'matterType' | 'assigneeId' | 'clientId' | 'deadlineDate'>>,
  ): Promise<void> {
    await delay(700);
    const item = items.value.find((t) => t.id === id);
    if (item) Object.assign(item, data);
  }

  return {
    items,
    activeItems,
    archivedItems,
    trashItems,
    getById,
    archive,
    reactivate,
    permanentDelete,
    create,
    update,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
