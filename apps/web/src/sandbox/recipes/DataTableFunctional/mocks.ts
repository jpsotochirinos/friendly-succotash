import { ref, computed } from 'vue';

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------
export type ClientScope = 'active' | 'archived';
export type ClientType = 'natural' | 'juridica';
export type ClientStatus = 'verified' | 'pending' | 'inactive';

export interface MockClient {
  id: string;
  name: string;
  type: ClientType;
  document: string; // DNI or RUC
  email: string;
  phone: string;
  status: ClientStatus;
  assigneeId: string | null;
  matterCount: number;
  lastActivityAt: string; // ISO timestamp
  scope: ClientScope;
  createdAt: string;
}

export interface MockClientUser {
  id: string;
  name: string;
  initials: string;
}

// -----------------------------------------------------------------------
// Static data
// -----------------------------------------------------------------------
export const MOCK_CLIENT_USERS: MockClientUser[] = [
  { id: 'u1', name: 'Carlos Mendoza', initials: 'CM' },
  { id: 'u2', name: 'Ana Torres', initials: 'AT' },
  { id: 'u3', name: 'Luis Paredes', initials: 'LP' },
  { id: 'u4', name: 'Sofia Vega', initials: 'SV' },
];

export const CLIENT_TYPE_OPTIONS: { label: string; value: ClientType }[] = [
  { label: 'Persona natural', value: 'natural' },
  { label: 'Persona jurídica', value: 'juridica' },
];

export const CLIENT_SCOPE_OPTIONS = [
  { label: 'Activos', value: 'active' },
  { label: 'Archivados', value: 'archived' },
];

export const clientTypeLabel: Record<ClientType, string> = {
  natural: 'Natural',
  juridica: 'Jurídica',
};

export const clientStatusLabel: Record<ClientStatus, string> = {
  verified: 'Verificado',
  pending: 'Pendiente',
  inactive: 'Inactivo',
};

export const clientStatusSeverity: Record<ClientStatus, 'success' | 'warn' | 'secondary'> = {
  verified: 'success',
  pending: 'warn',
  inactive: 'secondary',
};

export function getClientUser(id: string | null): MockClientUser | undefined {
  return MOCK_CLIENT_USERS.find((u) => u.id === id);
}

export function relativeTime(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diffMin = Math.floor((now - t) / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `hace ${diffD} d`;
  if (diffD < 30) return `hace ${Math.floor(diffD / 7)} sem`;
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

// -----------------------------------------------------------------------
// Mock dataset
// -----------------------------------------------------------------------
const NOW = Date.now();
const minutesAgo = (m: number) => new Date(NOW - m * 60 * 1000).toISOString();
const hoursAgo = (h: number) => minutesAgo(h * 60);
const daysAgo = (d: number) => hoursAgo(d * 24);

const ACTIVE: Omit<MockClient, 'scope'>[] = [
  {
    id: 'cl-001',
    name: 'Grupo Andino S.A.C.',
    type: 'juridica',
    document: '20512345678',
    email: 'legal@grupoandino.pe',
    phone: '+51 1 234 5678',
    status: 'verified',
    assigneeId: 'u2',
    matterCount: 8,
    lastActivityAt: hoursAgo(2),
    createdAt: '2023-03-15',
  },
  {
    id: 'cl-002',
    name: 'García Hermanos E.I.R.L.',
    type: 'juridica',
    document: '20598765432',
    email: 'contacto@garciahermanos.pe',
    phone: '+51 1 555 0123',
    status: 'verified',
    assigneeId: 'u1',
    matterCount: 3,
    lastActivityAt: hoursAgo(8),
    createdAt: '2024-01-20',
  },
  {
    id: 'cl-003',
    name: 'María del Carmen Quispe',
    type: 'natural',
    document: '45678912',
    email: 'mc.quispe@gmail.com',
    phone: '+51 987 654 321',
    status: 'verified',
    assigneeId: 'u3',
    matterCount: 1,
    lastActivityAt: daysAgo(2),
    createdAt: '2024-03-01',
  },
  {
    id: 'cl-004',
    name: 'Constructora Lima Norte S.A.',
    type: 'juridica',
    document: '20123456789',
    email: 'gerencia@clnorte.com',
    phone: '+51 1 478 2345',
    status: 'verified',
    assigneeId: 'u4',
    matterCount: 5,
    lastActivityAt: minutesAgo(30),
    createdAt: '2024-01-28',
  },
  {
    id: 'cl-005',
    name: 'Textiles del Sur S.R.L.',
    type: 'juridica',
    document: '20887766554',
    email: 'admin@textilessur.pe',
    phone: '+51 54 234 567',
    status: 'pending',
    assigneeId: 'u1',
    matterCount: 2,
    lastActivityAt: daysAgo(5),
    createdAt: '2024-02-20',
  },
  {
    id: 'cl-006',
    name: 'Juan Pérez Rodríguez',
    type: 'natural',
    document: '12345678',
    email: 'jperez@correo.com',
    phone: '+51 999 111 222',
    status: 'pending',
    assigneeId: null,
    matterCount: 0,
    lastActivityAt: daysAgo(15),
    createdAt: '2024-04-01',
  },
  {
    id: 'cl-007',
    name: 'Inversiones Pacífico S.A.C.',
    type: 'juridica',
    document: '20445566778',
    email: 'contacto@invpacifico.pe',
    phone: '+51 1 345 6789',
    status: 'verified',
    assigneeId: 'u2',
    matterCount: 4,
    lastActivityAt: hoursAgo(20),
    createdAt: '2023-09-10',
  },
  {
    id: 'cl-008',
    name: 'Sofía Ramírez Vargas',
    type: 'natural',
    document: '78901234',
    email: 'sofiarv@gmail.com',
    phone: '+51 956 789 012',
    status: 'inactive',
    assigneeId: 'u3',
    matterCount: 1,
    lastActivityAt: daysAgo(60),
    createdAt: '2023-08-15',
  },
  {
    id: 'cl-009',
    name: 'Distribuidora Andina Norte S.R.L.',
    type: 'juridica',
    document: '20334455667',
    email: 'ventas@distandina.pe',
    phone: '+51 44 567 890',
    status: 'verified',
    assigneeId: 'u4',
    matterCount: 6,
    lastActivityAt: hoursAgo(5),
    createdAt: '2023-12-05',
  },
  {
    id: 'cl-010',
    name: 'Mario Castillo Bravo',
    type: 'natural',
    document: '23456789',
    email: 'mariocb@hotmail.com',
    phone: '+51 945 678 901',
    status: 'verified',
    assigneeId: 'u1',
    matterCount: 2,
    lastActivityAt: daysAgo(3),
    createdAt: '2024-02-10',
  },
  {
    id: 'cl-011',
    name: 'Servicios Técnicos del Sur S.A.',
    type: 'juridica',
    document: '20778899001',
    email: 'admin@stsur.com.pe',
    phone: '+51 54 678 901',
    status: 'pending',
    assigneeId: 'u2',
    matterCount: 1,
    lastActivityAt: daysAgo(8),
    createdAt: '2024-03-22',
  },
  {
    id: 'cl-012',
    name: 'Patricia Hernández Salas',
    type: 'natural',
    document: '34567890',
    email: 'patricia.hs@correo.pe',
    phone: '+51 967 890 123',
    status: 'verified',
    assigneeId: 'u3',
    matterCount: 3,
    lastActivityAt: hoursAgo(12),
    createdAt: '2023-11-18',
  },
];

const ARCHIVED: Omit<MockClient, 'scope'>[] = [
  {
    id: 'cl-arch-1',
    name: 'Antigua Cía. Constructora S.A.',
    type: 'juridica',
    document: '20111222333',
    email: 'inactive@old.pe',
    phone: '+51 1 000 0000',
    status: 'inactive',
    assigneeId: 'u4',
    matterCount: 12,
    lastActivityAt: daysAgo(180),
    createdAt: '2022-05-10',
  },
  {
    id: 'cl-arch-2',
    name: 'Roberto Salinas (extinto)',
    type: 'natural',
    document: '11223344',
    email: 'salinas@extinct.pe',
    phone: '+51 1 111 1111',
    status: 'inactive',
    assigneeId: null,
    matterCount: 4,
    lastActivityAt: daysAgo(365),
    createdAt: '2021-08-20',
  },
];

export const INITIAL_CLIENTS: MockClient[] = [
  ...ACTIVE.map((c) => ({ ...c, scope: 'active' as ClientScope })),
  ...ARCHIVED.map((c) => ({ ...c, scope: 'archived' as ClientScope })),
];

// -----------------------------------------------------------------------
// Composable
// -----------------------------------------------------------------------
export function useMockClients() {
  const items = ref<MockClient[]>(INITIAL_CLIENTS.map((c) => ({ ...c })));

  const activeItems = computed(() => items.value.filter((c) => c.scope === 'active'));
  const archivedItems = computed(() => items.value.filter((c) => c.scope === 'archived'));

  function getById(id: string): MockClient | undefined {
    return items.value.find((c) => c.id === id);
  }

  function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function archive(id: string): Promise<void> {
    await delay(700);
    const c = items.value.find((x) => x.id === id);
    if (c) c.scope = 'archived';
  }

  async function reactivate(id: string): Promise<void> {
    await delay(700);
    const c = items.value.find((x) => x.id === id);
    if (c) c.scope = 'active';
  }

  async function permanentDelete(id: string): Promise<void> {
    await delay(900);
    const idx = items.value.findIndex((c) => c.id === id);
    if (idx >= 0) items.value.splice(idx, 1);
  }

  async function create(data: Omit<MockClient, 'id' | 'matterCount' | 'lastActivityAt' | 'createdAt' | 'scope'>): Promise<MockClient> {
    await delay(800);
    const newClient: MockClient = {
      id: `cl-${Date.now()}`,
      matterCount: 0,
      lastActivityAt: new Date().toISOString(),
      createdAt: new Date().toISOString().split('T')[0],
      scope: 'active',
      ...data,
    };
    items.value.unshift(newClient);
    return newClient;
  }

  async function update(id: string, data: Partial<Omit<MockClient, 'id'>>): Promise<void> {
    await delay(600);
    const c = items.value.find((x) => x.id === id);
    if (c) {
      Object.assign(c, data);
      c.lastActivityAt = new Date().toISOString();
    }
  }

  return {
    items,
    activeItems,
    archivedItems,
    getById,
    archive,
    reactivate,
    permanentDelete,
    create,
    update,
  };
}
