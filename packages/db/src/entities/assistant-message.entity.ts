import { Entity, Property, ManyToOne, OptionalProps } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import type { AssistantThread } from './assistant-thread.entity';

@Entity({ tableName: 'assistant_messages' })
export class AssistantMessage extends BaseEntity {
  [OptionalProps]?: 'content' | 'toolCalls' | 'toolCallId' | 'toolName' | 'feedback' | 'attachmentIds';

  @ManyToOne('AssistantThread', { nullable: false })
  thread!: AssistantThread;

  /** user | assistant | tool | system */
  @Property({ length: 32 })
  role!: string;

  @Property({ type: 'text', nullable: true })
  content?: string | null;

  @Property({ type: 'json', nullable: true })
  toolCalls?: unknown;

  @Property({ length: 128, nullable: true })
  toolCallId?: string;

  @Property({ length: 128, nullable: true })
  toolName?: string;

  /** up | down — feedback on assistant messages */
  @Property({ length: 8, nullable: true })
  feedback?: string;

  /** UUIDs of AssistantAttachment linked to this user message */
  @Property({ type: 'json', nullable: true })
  attachmentIds?: string[];
}
