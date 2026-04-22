import { Entity, Property, ManyToOne, Unique, Index, OptionalProps } from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import type { User } from './user.entity';

@Entity({ tableName: 'whatsapp_users' })
@Unique({ properties: ['organization', 'phoneNumber'] })
@Index({ properties: ['phoneNumber'] })
export class WhatsAppUser extends TenantBaseEntity {
  [OptionalProps]?:
    | 'verifiedAt'
    | 'verificationCode'
    | 'verificationExpiresAt'
    | 'verificationAttempts'
    | 'lastVerificationSentAt'
    | 'isActive'
    | 'receiveBriefing'
    | 'createdAt'
    | 'updatedAt';

  @ManyToOne('User', { nullable: false })
  user!: User;

  /** E.164 normalizado, ej. +519XXXXXXXX */
  @Property({ length: 20 })
  phoneNumber!: string;

  @Property({ type: 'timestamptz', nullable: true })
  verifiedAt?: Date;

  @Property({ default: true })
  isActive: boolean = true;

  @Property({ default: false })
  receiveBriefing: boolean = false;

  @Property({ length: 6, nullable: true })
  verificationCode?: string;

  @Property({ type: 'timestamptz', nullable: true })
  verificationExpiresAt?: Date;

  @Property({ type: 'int', default: 0 })
  verificationAttempts: number = 0;

  @Property({ type: 'timestamptz', nullable: true })
  lastVerificationSentAt?: Date;
}
