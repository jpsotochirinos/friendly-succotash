import { z } from 'zod';

/** Estado de lectura en bandeja SINOE (texto como en PJ). */
export const sinoeEstadoRevisionSchema = z.enum(['Leído', 'No Leído']);
export type SinoeEstadoRevision = z.infer<typeof sinoeEstadoRevisionSchema>;

export const sinoeAnexoSchema = z.object({
  tipo: z.string(),
  identificacionAnexo: z.string(),
  nroPaginas: z.string(),
  pesoArchivo: z.string(),
});
export type SinoeAnexo = z.infer<typeof sinoeAnexoSchema>;

/** Anexo con binario opcional tras descarga en el worker (no serializar a JSON). */
export type SinoeAnexoDownloaded = SinoeAnexo & {
  fileBuffer?: Buffer;
  suggestedFilename?: string;
};

export const sinoeNotificacionSchema = z.object({
  nroNotificacion: z.string(),
  nroExpediente: z.string(),
  sumilla: z.string(),
  organoJurisdiccional: z.string(),
  fecha: z.coerce.date(),
  estadoRevision: sinoeEstadoRevisionSchema,
  carpeta: z.string(),
  anexos: z.array(sinoeAnexoSchema).default([]),
});
export type SinoeNotificacion = z.infer<typeof sinoeNotificacionSchema>;

export const sinoeDateRangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

export const sinoeResultSchema = z.object({
  rangoFechas: sinoeDateRangeSchema,
  totalNotificaciones: z.number().int().nonnegative(),
  extraidoEn: z.coerce.date(),
  notificaciones: z.array(sinoeNotificacionSchema),
});
export type SinoeResult = z.infer<typeof sinoeResultSchema>;

/** Payload en `ScrapeResult.data` por ítem (compatible con repositorio). */
export type SinoeScrapeRow = SinoeNotificacion & {
  externalRef: string;
  anexos: SinoeAnexoDownloaded[];
};
