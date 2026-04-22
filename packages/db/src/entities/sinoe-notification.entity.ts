import {
  Entity,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
  JsonType,
  Index,
  Unique,
} from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import type { User } from './user.entity';
import type { Trackable } from './trackable.entity';
import type { WorkflowItem } from './workflow-item.entity';
import type { SinoeAttachment } from './sinoe-attachment.entity';

@Entity({ tableName: 'sinoe_notifications' })
@Unique({ properties: ['organization', 'nroNotificacion'] })
@Index({ properties: ['organization', 'fecha'] })
@Index({ properties: ['organization', 'nroExpediente'] })
export class SinoeNotification extends TenantBaseEntity {
  @Property({ length: 120 })
  nroNotificacion!: string;

  @Property({ type: 'text' })
  nroExpediente!: string;

  @Property({ type: 'text' })
  sumilla!: string;

  @Property({ type: 'text' })
  organoJurisdiccional!: string;

  @Property({ type: 'timestamptz' })
  fecha!: Date;

  @Property({ length: 32 })
  estadoRevision!: string;

  @Property({ type: 'text' })
  carpeta!: string;

  @ManyToOne('User', { nullable: false })
  user!: User;

  @ManyToOne('Trackable', { nullable: true })
  trackable?: Trackable;

  @ManyToOne('WorkflowItem', { nullable: true })
  workflowItem?: WorkflowItem;

  /** Ver `SINOE_ASSIGNMENT_STATUS` en @tracker/shared. */
  @Property({ length: 32, default: 'needs_expediente' })
  assignmentStatus: string = 'needs_expediente';

  @Property({ type: JsonType, nullable: true })
  rawData?: Record<string, unknown>;

  @OneToMany('SinoeAttachment', 'notification')
  attachments = new Collection<SinoeAttachment>(this);
}
