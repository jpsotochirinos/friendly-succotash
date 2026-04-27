import { Entity, Property, ManyToOne, Index, OptionalProps } from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import type { ActivityInstance } from './activity-instance.entity';
import type { User } from './user.entity';

@Entity({ tableName: 'activity_instance_comments' })
@Index({ properties: ['activityInstance'] })
export class ActivityInstanceComment extends TenantBaseEntity {
  [OptionalProps]?: 'createdAt' | 'updatedAt';

  @ManyToOne('ActivityInstance', { fieldName: 'activity_instance_id' })
  activityInstance!: ActivityInstance;

  @ManyToOne('User', { fieldName: 'user_id' })
  user!: User;

  @Property({ type: 'text' })
  body!: string;
}
