import {
  PrimaryKey,
  Property,
  BaseEntity as MikroBaseEntity,
} from '@mikro-orm/core';
import { v4 } from 'uuid';

export abstract class BaseEntity extends MikroBaseEntity {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @Property({ type: 'timestamptz' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
