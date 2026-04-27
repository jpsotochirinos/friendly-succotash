import { Entity, Property, Enum, ManyToOne, Unique, OptionalProps } from '@mikro-orm/core';
import { SignerStatus } from '@tracker/shared';
import { TenantBaseEntity } from './tenant-base.entity';
import type { SignatureRequest } from './signature-request.entity';
import type { User } from './user.entity';

/** PDF signature box in points (PDF coordinate system). */
export interface SignatureZone {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

@Entity({ tableName: 'signature_request_signers' })
@Unique({ properties: ['request', 'signerOrder'] })
export class SignatureRequestSigner extends TenantBaseEntity {
  [OptionalProps]?: 'signedAt' | 'createdAt' | 'updatedAt';

  @ManyToOne('SignatureRequest', { inversedBy: 'signers' })
  request!: SignatureRequest;

  @ManyToOne('User', { nullable: true })
  user?: User;

  @Property({ length: 255, nullable: true })
  externalName?: string;

  @Property({ length: 255, nullable: true })
  externalEmail?: string;

  @Property({ length: 32, nullable: true })
  externalPhone?: string;

  @Property()
  signerOrder!: number;

  @Enum({ items: () => SignerStatus, default: SignerStatus.PENDING })
  status: SignerStatus = SignerStatus.PENDING;

  /** SHA-256 hex of opaque token for external signers only. */
  @Property({ length: 64, nullable: true, unique: true })
  tokenHash?: string;

  @Property({ type: 'timestamptz', nullable: true })
  tokenExpiresAt?: Date;

  @Property({ type: 'timestamptz', nullable: true })
  signedAt?: Date;

  @Property({ type: 'json', nullable: true })
  signatureZone?: SignatureZone;
}
