import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class InstantiateWorkflowTemplateDto {
  @IsUUID()
  trackableId!: string;

  @IsDateString()
  @IsOptional()
  /** Fecha base para calcular dueDate con offsetDays (default: hoy). */
  startDate?: string;
}
