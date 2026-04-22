import { Entity, Property, Enum, ManyToOne, OptionalProps } from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import type { User } from './user.entity';
import type { Document } from './document.entity';
import type { AssistantThread } from './assistant-thread.entity';

export enum AssistantAttachmentStatus {
  STAGED = 'staged',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

@Entity({ tableName: 'assistant_attachments' })
export class AssistantAttachment extends TenantBaseEntity {
  [OptionalProps]?: 'extractedText' | 'document' | 'thread';

  @ManyToOne('AssistantThread', { nullable: true })
  thread?: AssistantThread;

  @ManyToOne('User', { nullable: false })
  uploadedBy!: User;

  @Enum({ items: () => AssistantAttachmentStatus, default: AssistantAttachmentStatus.STAGED })
  status: AssistantAttachmentStatus = AssistantAttachmentStatus.STAGED;

  @Property({ length: 500 })
  filename!: string;

  @Property({ length: 200 })
  mimeType!: string;

  @Property({ type: 'int' })
  size!: number;

  @Property({ length: 1024 })
  minioKey!: string;

  @ManyToOne('Document', { nullable: true })
  document?: Document;

  @Property({ type: 'text', nullable: true })
  extractedText?: string;
}
