import {
  Entity,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
} from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import type { Trackable } from './trackable.entity';
import type { Document } from './document.entity';

@Entity({ tableName: 'folders' })
export class Folder extends TenantBaseEntity {
  @Property({ length: 255 })
  name!: string;

  @Property({ length: 10, nullable: true })
  emoji?: string;

  @Property({ type: 'int', default: 0 })
  sortOrder: number = 0;

  @ManyToOne('Trackable', { nullable: false })
  trackable!: Trackable;

  @ManyToOne('Folder', { nullable: true })
  parent?: Folder;

  @OneToMany('Folder', 'parent')
  children = new Collection<Folder>(this);

  @OneToMany('Document', 'folder')
  documents = new Collection<Document>(this);
}
