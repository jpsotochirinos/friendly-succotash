import {
  Entity,
  Property,
  Enum,
  ManyToOne,
  OneToMany,
  Collection,
  OptionalProps,
  Cascade,
} from '@mikro-orm/core';
import { SignatureRequestStatus, SignatureMode } from '@tracker/shared';
import { TenantBaseEntity } from './tenant-base.entity';
import type { Document } from './document.entity';
import type { User } from './user.entity';
import type { SignatureRequestSigner } from './signature-request-signer.entity';

@Entity({ tableName: 'signature_requests' })
export class SignatureRequest extends TenantBaseEntity {
  [OptionalProps]?:
    | 'completedAt'
    | 'documentSignedKey'
    | 'documentHashAfter'
    | 'tsaTimestamp'
    | 'message'
    | 'createdAt'
    | 'updatedAt';

  @ManyToOne('Document')
  document!: Document;

  @ManyToOne('User')
  createdBy!: User;

  @Property({ length: 500 })
  title!: string;

  @Property({ type: 'text', nullable: true })
  message?: string;

  @Enum({ items: () => SignatureRequestStatus, default: SignatureRequestStatus.DRAFT })
  status: SignatureRequestStatus = SignatureRequestStatus.DRAFT;

  @Enum({ items: () => SignatureMode })
  mode!: SignatureMode;

  @Property({ type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @Property({ type: 'timestamptz' })
  expiresAt!: Date;

  /** MinIO key of the final sealed PDF after all signatures. */
  @Property({ nullable: true })
  documentSignedKey?: string;

  /** SHA-256 hex of the PDF at request creation (set when PDF is ready, after DOCX→PDF if needed). */
  @Property({ length: 64, nullable: true })
  documentHashBefore?: string;

  /** SHA-256 hex of the final PDF after sealing. */
  @Property({ length: 64, nullable: true })
  documentHashAfter?: string;

  /** FreeTSA RFC 3161 response (base64) or similar. */
  @Property({ type: 'text', nullable: true })
  tsaTimestamp?: string;

  /** True while DOCX→PDF conversion job is running. */
  @Property({ default: false })
  docxConversionPending: boolean = false;

  @Property({ type: 'text', nullable: true })
  conversionError?: string;

  @OneToMany('SignatureRequestSigner', 'request', { cascade: [Cascade.PERSIST, Cascade.REMOVE] })
  signers = new Collection<SignatureRequestSigner>(this);
}
