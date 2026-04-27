import type { MatterType } from '@tracker/shared';
import type { BlueprintDocumentType } from '@tracker/shared';

export type ActivityDef = {
  code: string;
  name: string;
  order: number;
  isMandatory?: boolean;
  requiresDocument?: boolean;
  suggestedDocumentType?: BlueprintDocumentType;
  description?: string;
  estimatedDurationMinutes?: number;
};

export type StageDef = {
  code: string;
  name: string;
  order: number;
  estimatedDurationDays?: number;
  isOptional?: boolean;
  activities: ActivityDef[];
};

export type SystemBlueprintDef = {
  code: string;
  name: string;
  matterType: MatterType;
  description?: string;
  changelog: string;
  stages: StageDef[];
  /**
   * If true and a SYSTEM blueprint with this `code` already exists, replace
   * stage/activity content when no `process_tracks` reference this blueprint.
   */
  enrichInPlace?: boolean;
};
