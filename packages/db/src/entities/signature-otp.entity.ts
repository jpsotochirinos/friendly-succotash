import { Entity, Property, ManyToOne, OptionalProps, Enum } from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import type { SignatureRequestSigner } from './signature-request-signer.entity';

export enum SignatureOtpChannel {
  EMAIL = 'email',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
}

@Entity({ tableName: 'signature_otps' })
export class SignatureOtp extends TenantBaseEntity {
  [OptionalProps]?: 'createdAt' | 'updatedAt';

  @ManyToOne('SignatureRequestSigner')
  signer!: SignatureRequestSigner;

  @Property({ length: 64 })
  codeHash!: string;

  @Property({ type: 'timestamptz' })
  expiresAt!: Date;

  @Property({ default: false })
  used: boolean = false;

  @Enum({ items: () => SignatureOtpChannel, default: SignatureOtpChannel.EMAIL })
  channel: SignatureOtpChannel = SignatureOtpChannel.EMAIL;

  @Property({ type: 'int', default: 0 })
  attempts: number = 0;

  @Property({ type: 'timestamptz', nullable: true })
  lastSentAt?: Date;
}
