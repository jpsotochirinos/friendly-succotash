import {
  Entity,
  Property,
  Enum,
  ManyToOne,
  JsonType,
  OptionalProps,
} from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { EvaluationResult } from '@tracker/shared';
import type { Document } from './document.entity';
import type { DocumentVersion } from './document-version.entity';

@Entity({ tableName: 'evaluations' })
export class Evaluation extends BaseEntity {
  [OptionalProps]?: 'result' | 'createdAt' | 'updatedAt';

  @ManyToOne('Document', { nullable: false })
  document!: Document;

  @ManyToOne('DocumentVersion', { nullable: true })
  documentVersion?: DocumentVersion;

  @Property({ length: 50 })
  type!: string;

  @Property({ type: 'float' })
  score!: number;

  @Property({ type: 'float' })
  threshold!: number;

  @Enum({ items: () => EvaluationResult, default: EvaluationResult.PENDING })
  result: EvaluationResult = EvaluationResult.PENDING;

  @Property({ type: JsonType, nullable: true })
  details?: Record<string, unknown>;
}
