import {
  Entity,
  Property,
  Enum,
  ManyToOne,
  Index,
  JsonType,
  OptionalProps,
} from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import { BlueprintOverrideOperation, BlueprintTargetType } from '@tracker/shared';
import type { Blueprint } from './blueprint.entity';
import type { User } from './user.entity';

/** Typed diff for TENANT/INSTANCE blueprints. */
@Entity({ tableName: 'blueprint_overrides' })
@Index({ properties: ['blueprint', 'targetType', 'targetCode'] })
export class BlueprintOverride extends TenantBaseEntity {
  [OptionalProps]?: 'targetCode' | 'originalValueSnapshot' | 'reason' | 'editedBy' | 'editedAt';

  @ManyToOne('Blueprint', { fieldName: 'blueprint_id' })
  blueprint!: Blueprint;

  @Enum({ items: () => BlueprintTargetType })
  targetType!: BlueprintTargetType;

  @Property({ length: 120, nullable: true })
  targetCode?: string;

  @Enum({ items: () => BlueprintOverrideOperation })
  operation!: BlueprintOverrideOperation;

  @Property({ type: JsonType })
  patch!: Record<string, unknown>;

  @Property({ type: JsonType, nullable: true })
  originalValueSnapshot?: Record<string, unknown>;

  @ManyToOne('User', { nullable: true, fieldName: 'edited_by_id' })
  editedBy?: User;

  @Property({ type: 'timestamptz', nullable: true })
  editedAt?: Date;

  @Property({ type: 'text', nullable: true })
  reason?: string;

  @Property({ default: false })
  isLocked: boolean = false;
}
