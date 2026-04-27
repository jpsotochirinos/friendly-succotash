import { IsDateString, IsUUID } from 'class-validator';

export class RegisterNotificationDateDto {
  @IsUUID()
  trackableId!: string;

  @IsUUID()
  workflowStateId!: string;

  @IsDateString()
  notificationDate!: string;
}
