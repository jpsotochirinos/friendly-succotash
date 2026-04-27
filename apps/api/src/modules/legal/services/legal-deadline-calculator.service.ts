import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { CourtClosure } from '@tracker/db';
import { LegalDeadlineCalculator, DeadlineCalendarType } from '@tracker/shared';

function dateStrToUtcNoon(s: string): Date {
  return new Date(`${s}T12:00:00.000Z`);
}

/** Expands [dateFrom, dateTo] inclusive to per-day UTC noon dates overlapping `year`. */
function expandClosureDaysAsFeriados(dateFrom: string, dateTo: string, year: number): Date[] {
  const start = dateStrToUtcNoon(dateFrom);
  const end = dateStrToUtcNoon(dateTo);
  const out: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    if (cur.getUTCFullYear() === year) {
      out.push(new Date(cur));
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

export type PlazoContext = {
  organizationId: string;
  /** If set, only closures where `courtName` matches (substring) or `isGlobal`. */
  courtName?: string;
};

@Injectable()
export class LegalDeadlineCalculatorService {
  constructor(private readonly em: EntityManager) {}

  async calcularPlazo(
    fechaInicio: Date,
    diasHabiles: number,
    tipo: DeadlineCalendarType,
    ctx?: PlazoContext,
  ): Promise<Date> {
    const year = fechaInicio.getUTCFullYear();
    const feriadosAdicionales = await this.obtenerFeriadosDinamicos(year, ctx);
    return LegalDeadlineCalculator.calcularPlazo(
      fechaInicio,
      diasHabiles,
      tipo,
      feriadosAdicionales,
    );
  }

  /**
   * Future: feriados móviles / judicial_holiday table.
   * Today: `CourtClosure` rows (org + optional court filter) as non-working days for the calculator.
   */
  private async obtenerFeriadosDinamicos(anio: number, ctx?: PlazoContext): Promise<Date[]> {
    const fromDb: Date[] = [];
    if (ctx?.organizationId) {
      const rows = await this.em.find(CourtClosure, { organization: { id: ctx.organizationId } });
      const courtLower = ctx.courtName?.toLowerCase().trim();
      for (const c of rows) {
        if (c.isGlobal) {
          fromDb.push(...expandClosureDaysAsFeriados(c.dateFrom, c.dateTo, anio));
          continue;
        }
        if (courtLower && c.courtName.toLowerCase().includes(courtLower)) {
          fromDb.push(...expandClosureDaysAsFeriados(c.dateFrom, c.dateTo, anio));
        } else if (!courtLower) {
          fromDb.push(...expandClosureDaysAsFeriados(c.dateFrom, c.dateTo, anio));
        }
      }
    }
    return fromDb;
  }

  async esHabilJudicial(fecha: Date, ctx?: PlazoContext): Promise<boolean> {
    const year = fecha.getUTCFullYear();
    const feriados = await this.obtenerFeriadosDinamicos(year, ctx);
    return LegalDeadlineCalculator.esHabilJudicial(fecha, feriados);
  }
}
