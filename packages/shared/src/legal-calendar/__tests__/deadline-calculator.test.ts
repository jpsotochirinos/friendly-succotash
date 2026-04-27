import { describe, it, expect } from 'vitest';
import { LegalDeadlineCalculator } from '../deadline-calculator';
import { DeadlineCalendarType } from '../../enums';

/** Día calendario en UTC (mediodía). */
function d(y: number, m: number, day: number): Date {
  return new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
}

describe('LegalDeadlineCalculator', () => {
  describe('calcularPlazo - días hábiles judiciales', () => {
    it('salta fin de semana', () => {
      const inicio = d(2025, 3, 7); // viernes UTC
      const fin = LegalDeadlineCalculator.calcularPlazo(
        inicio,
        3,
        DeadlineCalendarType.JUDICIAL,
      );
      expect(fin.toISOString().slice(0, 10)).toBe('2025-03-12');
    });

    it('salta feriado nacional (28 julio)', () => {
      const inicio = d(2025, 7, 21);
      const fin = LegalDeadlineCalculator.calcularPlazo(
        inicio,
        10,
        DeadlineCalendarType.JUDICIAL,
      );
      expect(fin.getUTCMonth()).toBeGreaterThanOrEqual(7);
    });

    it('salta vacaciones judiciales enero 1-15', () => {
      const inicio = d(2024, 12, 30);
      const fin = LegalDeadlineCalculator.calcularPlazo(
        inicio,
        5,
        DeadlineCalendarType.JUDICIAL,
      );
      const jan15 = d(2025, 1, 15);
      expect(fin.getTime()).toBeGreaterThan(jan15.getTime());
    });
  });

  describe('esHabilJudicial', () => {
    it('sábado es inhábil', () => {
      expect(LegalDeadlineCalculator.esHabilJudicial(d(2025, 3, 8))).toBe(false);
    });

    it('navidad es inhábil', () => {
      expect(LegalDeadlineCalculator.esHabilJudicial(d(2025, 12, 25))).toBe(false);
    });

    it('10 de enero es inhábil (vacaciones judiciales)', () => {
      expect(LegalDeadlineCalculator.esHabilJudicial(d(2025, 1, 10))).toBe(false);
    });

    it('martes normal es hábil', () => {
      expect(LegalDeadlineCalculator.esHabilJudicial(d(2025, 3, 11))).toBe(true);
    });
  });

  describe('calcularPlazo - calendar', () => {
    it('suma días calendario incluyendo fines de semana', () => {
      const inicio = d(2025, 3, 7);
      const fin = LegalDeadlineCalculator.calcularPlazo(
        inicio,
        3,
        DeadlineCalendarType.CALENDAR,
      );
      expect(fin.toISOString().slice(0, 10)).toBe('2025-03-10');
    });
  });
});
