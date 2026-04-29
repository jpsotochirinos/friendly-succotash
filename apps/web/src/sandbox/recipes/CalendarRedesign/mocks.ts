import type { ActuacionTipo } from './urgency';

export type Materia =
  | 'civil'
  | 'penal'
  | 'laboral'
  | 'administrativo'
  | 'constitucional'
  | 'arbitraje'
  | 'conciliacion'
  | 'indecopi';

export type EstadoActuacion =
  | 'pendiente'
  | 'en_revision'
  | 'listo_para_presentar'
  | 'presentado'
  | 'cumplido'
  | 'vencido';

export type EstadoExpediente = 'tramite' | 'archivado' | 'suspendido' | 'concluido';

export type Origen = 'manual' | 'sinoe' | 'cej' | 'regla_de_computo';

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
}

export interface Expediente {
  id: string;
  numero: string;
  caratula: string;
  materia: Materia;
  organo: string;
  cliente: string;
  responsableId: string;
  estado: EstadoExpediente;
  ultimoSinoe?: { fecha: string; resumen: string };
}

export interface Actuacion {
  id: string;
  tipo: ActuacionTipo;
  expedienteId: string;
  asignadoId: string | null;
  fechaIso: string;
  horaSignificativa: boolean;
  prioridad: 'normal' | 'alta' | 'urgente';
  estado: EstadoActuacion;
  origen: Origen;
  titulo: string;
  notas?: string;
}

export const USUARIOS: Usuario[] = [
  { id: 'u-edgar', nombre: 'Edgar', apellido: 'Quispe', email: 'edgar@alega.pe' },
  { id: 'u-aleja-v', nombre: 'Alejandra', apellido: 'Vásquez', email: 'alejandra.v@alega.pe' },
  { id: 'u-aleja-r', nombre: 'Alejandra', apellido: 'Rojas', email: 'alejandra.r@alega.pe' },
  { id: 'u-pierre', nombre: 'Pierre', apellido: 'Salazar', email: 'pierre@alega.pe' },
  { id: 'u-mariela', nombre: 'Mariela', apellido: 'Castro', email: 'mariela@alega.pe' },
  { id: 'u-rafael', nombre: 'Rafael', apellido: 'Fonseca', email: 'rafael@alega.pe' },
  { id: 'u-gabriela', nombre: 'Gabriela', apellido: 'Mendoza', email: 'gabriela@alega.pe' },
  { id: 'u-luis', nombre: 'Luis', apellido: 'Tello', email: 'luis@alega.pe' },
];

export const EXPEDIENTES: Expediente[] = [
  {
    id: 'e1',
    numero: '02534-2025',
    caratula: 'Pereira vs. Mendoza',
    materia: 'civil',
    organo: '3er JCV Lima',
    cliente: 'Pereira S.A.C.',
    responsableId: 'u-edgar',
    estado: 'tramite',
    ultimoSinoe: { fecha: '2026-04-24', resumen: 'Resolución N.° 5 — notifica auto admisorio' },
  },
  {
    id: 'e2',
    numero: '08712-2024',
    caratula: 'Inversiones Andina S.A. vs. SUNAT',
    materia: 'administrativo',
    organo: '5to JCA Lima',
    cliente: 'Inversiones Andina',
    responsableId: 'u-aleja-v',
    estado: 'tramite',
    ultimoSinoe: { fecha: '2026-04-22', resumen: 'Notifica resolución N.° 12' },
  },
  {
    id: 'e3',
    numero: '11023-2025',
    caratula: 'Castañeda — Despido arbitrario',
    materia: 'laboral',
    organo: '8vo JL Lima',
    cliente: 'Daniel Castañeda',
    responsableId: 'u-aleja-r',
    estado: 'tramite',
    ultimoSinoe: { fecha: '2026-04-20', resumen: 'Cita audiencia conciliatoria' },
  },
  {
    id: 'e4',
    numero: '04488-2025',
    caratula: 'M.P. vs. González (estafa agravada)',
    materia: 'penal',
    organo: '2do JIP Lima Norte',
    cliente: 'González (defensa)',
    responsableId: 'u-pierre',
    estado: 'tramite',
    ultimoSinoe: { fecha: '2026-04-26', resumen: 'Notifica auto de prisión preventiva' },
  },
  {
    id: 'e5',
    numero: '00921-2026',
    caratula: 'Sánchez vs. Fábrica Textil S.A.',
    materia: 'laboral',
    organo: '3er JL Callao',
    cliente: 'Mariana Sánchez',
    responsableId: 'u-mariela',
    estado: 'tramite',
  },
  {
    id: 'e6',
    numero: '03377-2024',
    caratula: 'Reclamo INDECOPI — Banco Norte',
    materia: 'indecopi',
    organo: 'Comisión Protección Consumidor',
    cliente: 'Asoc. Consumidores Lima',
    responsableId: 'u-rafael',
    estado: 'tramite',
    ultimoSinoe: { fecha: '2026-04-19', resumen: 'Resolución de admisión' },
  },
  {
    id: 'e7',
    numero: '07562-2023',
    caratula: 'Arbitraje — Construcciones del Sur',
    materia: 'arbitraje',
    organo: 'Centro Arbitraje CCL',
    cliente: 'Construcciones del Sur S.A.',
    responsableId: 'u-gabriela',
    estado: 'tramite',
  },
  {
    id: 'e8',
    numero: '12001-2025',
    caratula: 'Hábeas corpus — Vargas',
    materia: 'constitucional',
    organo: '1er JCo Lima',
    cliente: 'Familia Vargas',
    responsableId: 'u-luis',
    estado: 'tramite',
    ultimoSinoe: { fecha: '2026-04-25', resumen: 'Auto de admisión a trámite' },
  },
];

function isoWithHour(base: Date, dayOffset: number, hour: number, minute = 0): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + dayOffset, hour, minute);
  return d.toISOString();
}

function plazoIso(base: Date, dayOffset: number): string {
  return isoWithHour(base, dayOffset, 23, 59);
}

export function buildActuaciones(today: Date = new Date()): Actuacion[] {
  return [
    {
      id: 'a-1',
      tipo: 'audiencia',
      expedienteId: 'e1',
      asignadoId: 'u-edgar',
      fechaIso: isoWithHour(today, 0, 10, 30),
      horaSignificativa: true,
      prioridad: 'alta',
      estado: 'pendiente',
      origen: 'manual',
      titulo: 'Audiencia única',
    },
    {
      id: 'a-2',
      tipo: 'audiencia',
      expedienteId: 'e3',
      asignadoId: 'u-aleja-r',
      fechaIso: isoWithHour(today, 0, 14, 15),
      horaSignificativa: true,
      prioridad: 'alta',
      estado: 'pendiente',
      origen: 'manual',
      titulo: 'Audiencia conciliatoria',
    },
    {
      id: 'a-3',
      tipo: 'plazo',
      expedienteId: 'e1',
      asignadoId: 'u-edgar',
      fechaIso: plazoIso(today, 0),
      horaSignificativa: false,
      prioridad: 'urgente',
      estado: 'en_revision',
      origen: 'regla_de_computo',
      titulo: 'Contestación de demanda',
    },
    {
      id: 'a-4',
      tipo: 'plazo',
      expedienteId: 'e2',
      asignadoId: 'u-aleja-v',
      fechaIso: plazoIso(today, 0),
      horaSignificativa: false,
      prioridad: 'urgente',
      estado: 'pendiente',
      origen: 'regla_de_computo',
      titulo: 'Apelación de sentencia',
    },
    {
      id: 'a-5',
      tipo: 'plazo',
      expedienteId: 'e4',
      asignadoId: null,
      fechaIso: plazoIso(today, 0),
      horaSignificativa: false,
      prioridad: 'alta',
      estado: 'pendiente',
      origen: 'sinoe',
      titulo: 'Solicitud cese de prisión preventiva',
    },
    {
      id: 'a-6',
      tipo: 'plazo',
      expedienteId: 'e5',
      asignadoId: 'u-mariela',
      fechaIso: plazoIso(today, 1),
      horaSignificativa: false,
      prioridad: 'alta',
      estado: 'pendiente',
      origen: 'manual',
      titulo: 'Subsanación de demanda',
    },
    {
      id: 'a-7',
      tipo: 'audiencia',
      expedienteId: 'e8',
      asignadoId: 'u-luis',
      fechaIso: isoWithHour(today, 1, 9, 0),
      horaSignificativa: true,
      prioridad: 'urgente',
      estado: 'pendiente',
      origen: 'manual',
      titulo: 'Audiencia hábeas corpus',
    },
    {
      id: 'a-8',
      tipo: 'plazo',
      expedienteId: 'e6',
      asignadoId: 'u-rafael',
      fechaIso: plazoIso(today, 2),
      horaSignificativa: false,
      prioridad: 'normal',
      estado: 'pendiente',
      origen: 'sinoe',
      titulo: 'Descargos INDECOPI',
    },
    {
      id: 'a-9',
      tipo: 'diligencia',
      expedienteId: 'e7',
      asignadoId: 'u-gabriela',
      fechaIso: isoWithHour(today, 3, 11, 0),
      horaSignificativa: true,
      prioridad: 'normal',
      estado: 'pendiente',
      origen: 'manual',
      titulo: 'Diligencia de inspección',
    },
    {
      id: 'a-10',
      tipo: 'plazo',
      expedienteId: 'e1',
      asignadoId: 'u-edgar',
      fechaIso: plazoIso(today, 3),
      horaSignificativa: false,
      prioridad: 'normal',
      estado: 'pendiente',
      origen: 'manual',
      titulo: 'Ofrecimiento de pruebas',
    },
    {
      id: 'a-11',
      tipo: 'plazo',
      expedienteId: 'e2',
      asignadoId: 'u-aleja-v',
      fechaIso: plazoIso(today, 5),
      horaSignificativa: false,
      prioridad: 'normal',
      estado: 'pendiente',
      origen: 'manual',
      titulo: 'Absolución de tacha',
    },
    {
      id: 'a-12',
      tipo: 'audiencia',
      expedienteId: 'e7',
      asignadoId: 'u-gabriela',
      fechaIso: isoWithHour(today, 7, 15, 30),
      horaSignificativa: true,
      prioridad: 'alta',
      estado: 'pendiente',
      origen: 'manual',
      titulo: 'Audiencia arbitral final',
    },
    {
      id: 'a-13',
      tipo: 'plazo',
      expedienteId: 'e3',
      asignadoId: 'u-aleja-r',
      fechaIso: plazoIso(today, 10),
      horaSignificativa: false,
      prioridad: 'normal',
      estado: 'pendiente',
      origen: 'regla_de_computo',
      titulo: 'Contestación de reconvención',
    },
    {
      id: 'a-14',
      tipo: 'plazo',
      expedienteId: 'e4',
      asignadoId: 'u-pierre',
      fechaIso: plazoIso(today, 14),
      horaSignificativa: false,
      prioridad: 'alta',
      estado: 'pendiente',
      origen: 'manual',
      titulo: 'Apelación de medida coercitiva',
    },
    {
      id: 'a-15',
      tipo: 'plazo',
      expedienteId: 'e5',
      asignadoId: 'u-mariela',
      fechaIso: plazoIso(today, -2),
      horaSignificativa: false,
      prioridad: 'urgente',
      estado: 'vencido',
      origen: 'manual',
      titulo: 'Subsanación documental',
    },
  ];
}

export interface CumpleEvento {
  fechaIso: string;
  usuarioId: string;
}

export function buildCumples(today: Date = new Date()): CumpleEvento[] {
  return [
    {
      fechaIso: new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString(),
      usuarioId: 'u-pierre',
    },
  ];
}

export interface SinoePendiente {
  id: string;
  expedienteId: string;
  fechaIso: string;
  resumen: string;
}

export function buildSinoePendientes(today: Date = new Date()): SinoePendiente[] {
  return [
    {
      id: 's-1',
      expedienteId: 'e1',
      fechaIso: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).toISOString(),
      resumen: 'Resolución N.° 5 — auto admisorio',
    },
    {
      id: 's-2',
      expedienteId: 'e2',
      fechaIso: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).toISOString(),
      resumen: 'Notifica resolución N.° 12',
    },
    {
      id: 's-3',
      expedienteId: 'e4',
      fechaIso: new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString(),
      resumen: 'Auto de prisión preventiva',
    },
    {
      id: 's-4',
      expedienteId: 'e8',
      fechaIso: new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString(),
      resumen: 'Auto de admisión a trámite',
    },
    {
      id: 's-5',
      expedienteId: 'e6',
      fechaIso: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2).toISOString(),
      resumen: 'Resolución de admisión',
    },
  ];
}

export function displayName(u: Usuario, all: Usuario[]): string {
  const dup = all.filter((x) => x.nombre === u.nombre).length > 1;
  if (!dup) return u.nombre;
  return `${u.nombre} ${u.apellido[0]}.`;
}

export function displayNameById(id: string | null, all: Usuario[]): string {
  if (!id) return 'Sin asignar';
  const u = all.find((x) => x.id === id);
  if (!u) return 'Sin asignar';
  return displayName(u, all);
}

export function findExpediente(id: string): Expediente | undefined {
  return EXPEDIENTES.find((e) => e.id === id);
}

export const MATERIA_LABEL: Record<Materia, string> = {
  civil: 'Civil',
  penal: 'Penal',
  laboral: 'Laboral',
  administrativo: 'Administrativo',
  constitucional: 'Constitucional',
  arbitraje: 'Arbitraje',
  conciliacion: 'Conciliación',
  indecopi: 'INDECOPI',
};
