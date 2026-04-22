import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsString,
  ValidateNested,
} from 'class-validator';
import { WHATSAPP_NOTIFICATION_EVENT_TYPES } from '@tracker/shared';

const EVENT_TYPES = [...WHATSAPP_NOTIFICATION_EVENT_TYPES] as string[];

export class WhatsAppEventOptInItemDto {
  @IsString()
  @IsIn(EVENT_TYPES)
  eventType!: string;

  @IsBoolean()
  enabled!: boolean;
}

export class WhatsAppEventOptInBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WhatsAppEventOptInItemDto)
  items!: WhatsAppEventOptInItemDto[];
}
