import {
  IsString,
  IsOptional,
  IsDateString,
  IsIn,
  IsBoolean,
  IsInt,
  IsObject,
  MaxLength,
  Matches,
  IsArray,
  ArrayMinSize,
  IsUUID,
} from 'class-validator';
import type { ActionType } from '@tracker/shared';
import { ACTION_TYPE_VALUES } from '../../../common/class-validator-enums';

export class CreateWorkflowItemDto {
  @IsString()
  trackableId!: string;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  /** Etiqueta libre: Fase, Actuacion, Escrito, Plazo, etc. */
  @IsString()
  @IsOptional()
  @MaxLength(120)
  kind?: string;

  @IsOptional()
  @IsIn([...ACTION_TYPE_VALUES])
  actionType?: ActionType;

  /** Override del flujo configurable para esta actividad (workflow definition id). */
  @IsUUID()
  @IsOptional()
  workflowId?: string;

  @IsString()
  @IsOptional()
  assignedToId?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsBoolean()
  @IsOptional()
  requiresDocument?: boolean;

  @IsBoolean()
  @IsOptional()
  isLegalDeadline?: boolean;

  @IsString()
  @IsOptional()
  documentTemplateId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  /** Color de acento en UI (#RRGGBB). */
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  accentColor?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  location?: string;

  @IsIn(['low', 'normal', 'high', 'urgent'])
  @IsOptional()
  priority?: 'low' | 'normal' | 'high' | 'urgent';

  @IsBoolean()
  @IsOptional()
  allDay?: boolean;

  @IsArray()
  @IsInt({ each: true })
  @ArrayMinSize(0)
  @IsOptional()
  reminderMinutesBefore?: number[];

  @IsString()
  @IsOptional()
  @MaxLength(32)
  calendarColor?: string;

  @IsString()
  @IsOptional()
  rrule?: string;

  /** Secondary assignees (stored in metadata). */
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  secondaryAssigneeIds?: string[];
}
