import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class AdvanceStageDto {
  @IsUUID()
  trackableId!: string;

  @IsUUID()
  targetStateId!: string;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
