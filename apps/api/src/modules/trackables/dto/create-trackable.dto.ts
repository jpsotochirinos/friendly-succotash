import { IsString, IsOptional, IsDateString, IsObject } from 'class-validator';

export class CreateTrackableDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  type!: string;

  @IsString()
  @IsOptional()
  assignedToId?: string;

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
