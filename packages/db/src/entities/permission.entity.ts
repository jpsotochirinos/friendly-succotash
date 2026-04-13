import {
  Entity,
  Property,
  ManyToMany,
  Collection,
  Unique,
  OptionalProps,
} from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import type { Role } from './role.entity';

@Entity({ tableName: 'permissions' })
@Unique({ properties: ['code'] })
export class Permission extends BaseEntity {
  [OptionalProps]?: 'createdAt' | 'updatedAt';

  @Property({ length: 100 })
  code!: string;

  @Property({ length: 100 })
  category!: string;

  @Property({ nullable: true })
  description?: string;

  @ManyToMany('Role', 'permissions')
  roles = new Collection<Role>(this);
}
