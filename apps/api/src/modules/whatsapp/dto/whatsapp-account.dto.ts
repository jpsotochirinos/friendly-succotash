import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class WhatsAppAccountUpdateDto {
  /** Meta Cloud API: obligatorio. Twilio/360dialog: puede omitirse; el API usa `displayPhone` normalizado. */
  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string' && value.trim() === '') return undefined;
    return value;
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  phoneNumberId?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(32)
  displayPhone!: string;

  @IsString()
  @MaxLength(32)
  provider!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  briefingCron?: string;

  @IsOptional()
  @IsBoolean()
  briefingEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  briefingGroupId?: string;

  /** Org: habilita/deshabilita envío de notificaciones al canal WhatsApp (settings.notifications.whatsappEnabled). */
  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;
}
