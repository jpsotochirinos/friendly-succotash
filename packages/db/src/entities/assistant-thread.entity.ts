import {
  Entity,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
  OptionalProps,
} from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import type { User } from './user.entity';
import type { Trackable } from './trackable.entity';

@Entity({ tableName: 'assistant_threads' })
export class AssistantThread extends TenantBaseEntity {
  [OptionalProps]?: 'title' | 'lastMessageAt' | 'archivedAt' | 'pinnedTrackable' | 'pendingInteractive';

  @ManyToOne('User', { nullable: false })
  user!: User;

  @Property({ length: 500, nullable: true })
  title?: string;

  @ManyToOne('Trackable', { nullable: true })
  pinnedTrackable?: Trackable;

  @Property({ type: 'timestamptz', nullable: true })
  lastMessageAt?: Date;

  @Property({ type: 'timestamptz', nullable: true })
  archivedAt?: Date;

  /** Estado efímero para listas/botones interactivos en WhatsApp (JSON). */
  @Property({ type: 'json', nullable: true })
  pendingInteractive?: unknown;

  @OneToMany('AssistantMessage', 'thread')
  messages = new Collection<object>(this);

  @OneToMany('AssistantAttachment', 'thread')
  attachments = new Collection<object>(this);
}
