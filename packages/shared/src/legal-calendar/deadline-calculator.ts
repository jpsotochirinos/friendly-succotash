import { DeadlineCalendarType } from '../enums';

/**
 * Calculadora de plazos legales (Perú): días hábiles judiciales, feriados fijos,
 * vacaciones judiciales por defecto (ene 1–15, jul 15–31).
 *
 * Usa componentes UTC en fechas para resultados deterministas en servidor (TZ=UTC).
 * Las fechas de entrada deben representar el día calendario deseado (p. ej. mediodía UTC).
 */
export class LegalDeadlineCalculator {
  private static readonly FERIADOS_FIJOS: Array<{ mes: number; dia: number }> = [
    { mes: 1, dia: 1 },
    { mes: 5, dia: 1 },
    { mes: 6, dia: 7 },
    { mes: 6, dia: 29 },
    { mes: 7, dia: 23 },
    { mes: 7, dia: 28 },
    { mes: 7, dia: 29 },
    { mes: 8, dia: 6 },
    { mes: 8, dia: 30 },
    { mes: 10, dia: 8 },
    { mes: 11, dia: 1 },
    { mes: 12, dia: 8 },
    { mes: 12, dia: 9 },
    { mes: 12, dia: 25 },
  ];

  static calcularPlazo(
    fechaInicio: Date,
    dias: number,
    tipo: DeadlineCalendarType,
    feriadosAdicionales: Date[] = [],
  ): Date {
    if (tipo === DeadlineCalendarType.CALENDAR) {
      const r = this.cloneUtc(fechaInicio);
      r.setUTCDate(r.getUTCDate() + dias);
      return r;
    }

    const esValido =
      tipo === DeadlineCalendarType.JUDICIAL
        ? (d: Date) => this.esHabilJudicial(d, feriadosAdicionales)
        : (d: Date) => this.esHabilNegocio(d, feriadosAdicionales);

    let fecha = this.cloneUtc(fechaInicio);
    let diasContados = 0;

    while (diasContados < dias) {
      fecha.setUTCDate(fecha.getUTCDate() + 1);
      if (esValido(fecha)) {
        diasContados++;
      }
    }

    while (!esValido(fecha)) {
      fecha.setUTCDate(fecha.getUTCDate() + 1);
    }

    return fecha;
  }

  static esHabilJudicial(fecha: Date, feriadosAdicionales: Date[] = []): boolean {
    const dia = fecha.getUTCDay();
    if (dia === 0 || dia === 6) return false;
    if (this.esFeriadoNacional(fecha)) return false;
    if (this.esVacacionJudicial(fecha)) return false;
    if (this.esFeriadoAdicional(fecha, feriadosAdicionales)) return false;
    return true;
  }

  static esHabilNegocio(fecha: Date, feriadosAdicionales: Date[] = []): boolean {
    const dia = fecha.getUTCDay();
    if (dia === 0 || dia === 6) return false;
    if (this.esFeriadoNacional(fecha)) return false;
    if (this.esFeriadoAdicional(fecha, feriadosAdicionales)) return false;
    return true;
  }

  static esFeriadoNacional(fecha: Date): boolean {
    const mes = fecha.getUTCMonth() + 1;
    const dia = fecha.getUTCDate();
    return this.FERIADOS_FIJOS.some((f) => f.mes === mes && f.dia === dia);
  }

  static esVacacionJudicial(fecha: Date): boolean {
    const mes = fecha.getUTCMonth() + 1;
    const dia = fecha.getUTCDate();
    if (mes === 1 && dia >= 1 && dia <= 15) return true;
    if (mes === 7 && dia >= 15 && dia <= 31) return true;
    return false;
  }

  static diasHabilesEntre(
    fechaInicio: Date,
    fechaFin: Date,
    tipo: DeadlineCalendarType = DeadlineCalendarType.JUDICIAL,
    feriadosAdicionales: Date[] = [],
  ): number {
    const esValido =
      tipo === DeadlineCalendarType.JUDICIAL
        ? (d: Date) => this.esHabilJudicial(d, feriadosAdicionales)
        : (d: Date) => this.esHabilNegocio(d, feriadosAdicionales);

    let count = 0;
    const fecha = this.cloneUtc(fechaInicio);
    fecha.setUTCDate(fecha.getUTCDate() + 1);
    const fin = this.cloneUtc(fechaFin);

    while (fecha <= fin) {
      if (esValido(fecha)) count++;
      fecha.setUTCDate(fecha.getUTCDate() + 1);
    }
    return count;
  }

  private static cloneUtc(d: Date): Date {
    return new Date(d.getTime());
  }

  private static esFeriadoAdicional(fecha: Date, feriados: Date[]): boolean {
    return feriados.some(
      (f) =>
        f.getUTCFullYear() === fecha.getUTCFullYear() &&
        f.getUTCMonth() === fecha.getUTCMonth() &&
        f.getUTCDate() === fecha.getUTCDate(),
    );
  }
}
