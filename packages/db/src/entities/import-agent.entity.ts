import { Entity, Property, ManyToOne, JsonType, Index } from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import type { User } from './user.entity';

/** Token de larga duración para el futuro agente de escritorio (hash bcrypt del secreto). */
@Entity({ tableName: 'import_agents' })
@Index({ properties: ['organization', 'user'] })
export class ImportAgent extends TenantBaseEntity {
  @ManyToOne('User', { nullable: false })
  user!: User;

  @Property({ length: 200, nullable: true })
  label?: string;

  @Property({ length: 128 })
  tokenHash!: string;

  @Property({ type: 'timestamptz', nullable: true })
  lastHeartbeatAt?: Date;

  @Property({ type: JsonType, nullable: true })
  lastStats?: Record<string, unknown>;
}
