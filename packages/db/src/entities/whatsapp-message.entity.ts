import {
  Entity,
  Property,
  ManyToOne,
  Unique,
  Index,
  OptionalProps,
} from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import type { WhatsAppUser } from './whatsapp-user.entity';

@Entity({ tableName: 'whatsapp_messages' })
@Unique({ properties: ['organization', 'externalId'] })
@Index({ properties: ['organization', 'timestamp'] })
export class WhatsAppMessage extends TenantBaseEntity {
  [OptionalProps]?:
    | 'groupId'
    | 'sender'
    | 'processedAt'
    | 'createdAt'
    | 'updatedAt';

  @Property({ length: 120 })
  externalId!: string;

  @Property({ length: 120, nullable: true })
  groupId?: string;

  @Property({ length: 32 })
  fromPhone!: string;

  @ManyToOne('WhatsAppUser', { nullable: true })
  sender?: WhatsAppUser;

  @Property({ type: 'text' })
  body!: string;

  /** inbound | outbound (ver WhatsAppMessageDirection en @tracker/shared). */
  @Property({ length: 16 })
  direction!: string;

  @Property({ type: 'timestamptz' })
  timestamp!: Date;

  @Property({ type: 'timestamptz', nullable: true })
  processedAt?: Date;
}
