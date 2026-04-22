import { IsBoolean, IsOptional } from 'class-validator';

export class WhatsAppMePreferencesDto {
  @IsOptional()
  @IsBoolean()
  receiveBriefing?: boolean;
}
