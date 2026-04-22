import {
  IsString,
  IsOptional,
  IsIn,
  MaxLength,
  IsInt,
  IsBoolean,
  Min,
  Max,
  IsArray,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { ActionType } from '@tracker/shared';
import { ACTION_TYPE_VALUES } from '../../../common/class-validator-enums';

export class CreateWorkflowTemplateItemDto {
  @IsString()
  @MaxLength(500)
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  kind?: string;

  @IsOptional()
  @IsIn([...ACTION_TYPE_VALUES])
  actionType?: ActionType;

  /** Parent template item id (omit for root) */
  @IsString()
  @IsOptional()
  parentId?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(3650)
  offsetDays?: number;

  @IsBoolean()
  @IsOptional()
  requiresDocument?: boolean;

  @IsString()
  @IsOptional()
  documentTemplateId?: string | null;

  /** ECA rule snapshots (optional); copied to workflow items on instantiate. */
  @IsOptional()
  @IsArray()
  triggers?: Record<string, unknown>[];

  /** Workflow definition for leaf items (Jira-style states). */
  @IsOptional()
  @IsUUID()
  workflowId?: string | null;
}
