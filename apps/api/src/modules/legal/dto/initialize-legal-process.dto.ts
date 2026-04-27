import { IsUUID } from 'class-validator';

export class InitializeLegalProcessDto {
  @IsUUID()
  trackableId!: string;

  @IsUUID()
  workflowDefinitionId!: string;
}
