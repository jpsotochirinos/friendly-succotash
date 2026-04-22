import { IsBoolean, IsDateString, IsOptional } from 'class-validator';

export class RescheduleEventDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsBoolean()
  @IsOptional()
  allDay?: boolean;
}
