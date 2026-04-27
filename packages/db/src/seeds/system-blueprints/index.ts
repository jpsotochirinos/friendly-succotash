import type { SystemBlueprintDef } from './types';
import { DEMO_AND_FREEFORM } from './demo-freeform';
import { FAMILY_CIVIL_BLUEPRINTS } from './family-civil';
import { MATTER_EXTRA_BLUEPRINTS } from './matters-extras';

/** Full SYSTEM blueprint catalog (seed). */
export const ALL_SYSTEM_BLUEPRINT_DEFS: SystemBlueprintDef[] = [
  ...DEMO_AND_FREEFORM,
  ...FAMILY_CIVIL_BLUEPRINTS,
  ...MATTER_EXTRA_BLUEPRINTS,
];

export type { SystemBlueprintDef, ActivityDef, StageDef } from './types';
