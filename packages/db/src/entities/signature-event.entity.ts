import { Entity, Property, Enum, ManyToOne, OptionalProps } from '@mikro-orm/core';
import { SignatureEventType } from '@tracker/shared';
import { TenantBaseEntity } from './tenant-base.entity';
import type { SignatureRequestSigner } from './signature-request-signer.entity';

/**
 * Immutable audit log: only INSERTs via service layer (no updates / soft delete).
 */
@Entity({ tableName: 'signature_events' })
export class SignatureEvent extends TenantBaseEntity {
  [OptionalProps]?: 'otpVerifiedAt' | 'documentHash' | 'metadata' | 'createdAt' | 'updatedAt';

  @ManyToOne('SignatureRequestSigner')
  signer!: SignatureRequestSigner;

  @Enum({ items: () => SignatureEventType })
  eventType!: SignatureEventType;

  @Property({ length: 64 })
  ipAddress!: string;

  @Property({ type: 'text' })
  userAgent!: string;

  @Property({ type: 'timestamptz' })
  eventAt!: Date;

  @Property({ type: 'timestamptz', nullable: true })
  otpVerifiedAt?: Date;

  @Property({ length: 64, nullable: true })
  documentHash?: string;

  @Property({ type: 'json', nullable: true })
  metadata?: Record<string, unknown>;
}
