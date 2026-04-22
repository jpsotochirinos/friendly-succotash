import { Entity, Property, ManyToOne, Unique, OptionalProps } from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import type { User } from './user.entity';

/** Per-user opt-in for pushing notification types to WhatsApp (hybrid model with whatsapp_users.receive_briefing for briefing). */
@Entity({ tableName: 'whatsapp_event_opt_in' })
@Unique({ properties: ['user', 'eventType'] })
export class WhatsAppEventOptIn extends TenantBaseEntity {
  [OptionalProps]?: 'enabled' | 'createdAt' | 'updatedAt';

  @ManyToOne('User', { nullable: false })
  user!: User;

  @Property({ length: 64 })
  eventType!: string;

  @Property({ default: true })
  enabled: boolean = true;
}
