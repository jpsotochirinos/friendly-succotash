import {
  IsString,
  IsOptional,
  IsDateString,
  IsObject,
  IsIn,
  MaxLength,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import type { MatterType } from '@tracker/shared';
import { MATTER_TYPE_VALUES } from '../../../common/class-validator-enums';

export class CreateTrackableDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsIn([...MATTER_TYPE_VALUES])
  matterType?: MatterType;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  expedientNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  court?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  counterpartyName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(8)
  jurisdiction?: string;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  assignedToId?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsUUID()
  clientId?: string | null;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
