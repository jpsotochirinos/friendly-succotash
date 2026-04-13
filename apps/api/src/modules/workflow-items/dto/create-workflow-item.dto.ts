import { IsString, IsOptional, IsDateString, IsEnum, IsBoolean, IsInt } from 'class-validator';
import { WorkflowItemType, ActionType } from '@tracker/shared';

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

  @IsEnum(WorkflowItemType)
  itemType!: WorkflowItemType;

  @IsEnum(ActionType)
  @IsOptional()
  actionType?: ActionType;

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

  @IsString()
  @IsOptional()
  documentTemplateId?: string;
}
