import { PlanTier } from '../enums/index';

/** Default catalog values (DB `plan_catalog` is seeded from this). */
export const PLAN_CATALOG: Record<
  PlanTier,
  { credits: number; maxUsers: number; priceCents: number }
> = {
  [PlanTier.FREE]: { credits: 200, maxUsers: 2, priceCents: 0 },
  [PlanTier.BASIC]: { credits: 5000, maxUsers: 10, priceCents: 4900 },
  [PlanTier.PRO]: { credits: 50000, maxUsers: 50, priceCents: 14900 },
};
