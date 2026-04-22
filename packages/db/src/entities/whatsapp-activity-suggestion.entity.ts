import {
  Entity,
  Property,
  ManyToOne,
  Index,
  OptionalProps,
} from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import type { WhatsAppMessage } from './whatsapp-message.entity';
import type { WhatsAppUser } from './whatsapp-user.entity';
import type { Trackable } from './trackable.entity';
import type { WorkflowItem } from './workflow-item.entity';

@Entity({ tableName: 'whatsapp_activity_suggestions' })
@Index({ properties: ['status'] })
export class WhatsAppActivitySuggestion extends TenantBaseEntity {
  [OptionalProps]?:
    | 'relatedTrackable'
    | 'suggestedTitle'
    | 'workflowItem'
    | 'confirmedAt'
    | 'createdAt'
    | 'updatedAt';

  @ManyToOne('WhatsAppMessage', { nullable: false })
  sourceMessage!: WhatsAppMessage;

  @ManyToOne('WhatsAppUser', { nullable: false })
  suggestedTo!: WhatsAppUser;

  @ManyToOne('Trackable', { nullable: true })
  relatedTrackable?: Trackable;

  @Property({ type: 'text' })
  extractedText!: string;

  @Property({ type: 'text', nullable: true })
  suggestedTitle?: string;

  /** pending | accepted | rejected | ignored */
  @Property({ length: 32, default: 'pending' })
  status: string = 'pending';

  @ManyToOne('WorkflowItem', { nullable: true })
  workflowItem?: WorkflowItem;

  @Property({ type: 'timestamptz', nullable: true })
  confirmedAt?: Date;
}
