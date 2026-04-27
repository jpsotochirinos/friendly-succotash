import {
  Entity,
  Property,
  Enum,
  ManyToOne,
  OneToMany,
  Collection,
  Index,
  OptionalProps,
} from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { BlueprintScope, MatterType } from '@tracker/shared';
import type { Organization } from './organization.entity';
import type { BlueprintVersion } from './blueprint-version.entity';
import type { BlueprintOverride } from './blueprint-override.entity';

/**
 * Procedural / matter blueprint. SYSTEM rows have `organization` null.
 * TENANT/INSTANCE are scoped to an organization.
 */
@Entity({ tableName: 'blueprints' })
@Index({ properties: ['scope', 'code'] })
export class Blueprint extends BaseEntity {
  [OptionalProps]?: 'description' | 'subMatterType' | 'applicableLaw' | 'prefix' | 'currentVersion' | 'parentBlueprint';

  @Enum({ items: () => BlueprintScope })
  scope!: BlueprintScope;

  @ManyToOne('Organization', { nullable: true, fieldName: 'organization_id' })
  organization?: Organization;

  @Property({ length: 120 })
  code!: string;

  @Property({ length: 500 })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Enum({ items: () => MatterType, nullable: true })
  matterType?: MatterType;

  @Property({ length: 120, nullable: true })
  subMatterType?: string;

  @ManyToOne('Blueprint', { nullable: true, fieldName: 'parent_blueprint_id' })
  parentBlueprint?: Blueprint;

  @ManyToOne('BlueprintVersion', { nullable: true, fieldName: 'current_version_id' })
  currentVersion?: BlueprintVersion;

  @Property({ length: 50, nullable: true })
  applicableLaw?: string;

  @Property({ type: 'json', nullable: true })
  legalReferences?: string[];

  @Property({ length: 32, nullable: true })
  prefix?: string;

  @Property({ default: true })
  isActive: boolean = true;

  @OneToMany('BlueprintVersion', 'blueprint')
  versions = new Collection<BlueprintVersion>(this);

  @OneToMany('BlueprintOverride', 'blueprint')
  overrides = new Collection<BlueprintOverride>(this);
}
