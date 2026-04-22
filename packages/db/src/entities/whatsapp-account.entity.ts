import { Entity, Property, Unique, JsonType, OptionalProps } from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';

@Entity({ tableName: 'whatsapp_accounts' })
@Unique({ properties: ['organization'] })
export class WhatsAppAccount extends TenantBaseEntity {
  [OptionalProps]?:
    | 'groupIds'
    | 'briefingGroupId'
    | 'briefingCron'
    | 'briefingEnabled'
    | 'createdAt'
    | 'updatedAt';

  /** ID del número en el proveedor (Twilio/Meta phone_number_id, etc.). */
  @Property({ length: 120 })
  phoneNumberId!: string;

  @Property({ length: 32 })
  displayPhone!: string;

  /** twilio | dialog360 | meta (ver WhatsAppProviderEnum en @tracker/shared). */
  @Property({ length: 32 })
  provider!: string;

  @Property({ type: JsonType, nullable: true })
  groupIds?: string[];

  @Property({ length: 64, default: '0 8 * * *' })
  briefingCron: string = '0 8 * * *';

  @Property({ default: false })
  briefingEnabled: boolean = false;

  @Property({ length: 120, nullable: true })
  briefingGroupId?: string;
}
