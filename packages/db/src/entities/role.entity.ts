import {
  Entity,
  Property,
  ManyToMany,
  Collection,
  OneToMany,
  ManyToOne,
  Unique,
  OptionalProps,
} from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import type { Permission } from './permission.entity';
import type { User } from './user.entity';

@Entity({ tableName: 'roles' })
@Unique({ properties: ['organization', 'name'] })
export class Role extends TenantBaseEntity {
  [OptionalProps]?: 'isSystem' | 'createdAt' | 'updatedAt';

  @Property({ length: 100 })
  name!: string;

  @Property({ nullable: true })
  description?: string;

  @Property({ default: false })
  isSystem: boolean = false;

  @ManyToMany('Permission', 'roles', { owner: true, pivotTable: 'role_permissions' })
  permissions = new Collection<Permission>(this);

  @OneToMany('User', 'role')
  users = new Collection<User>(this);
}
