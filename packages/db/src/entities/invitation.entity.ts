import { Entity, Property, Enum, ManyToOne } from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import type { Role } from './role.entity';
import type { User } from './user.entity';

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

@Entity({ tableName: 'organization_invitations' })
export class Invitation extends TenantBaseEntity {
  @Property({ length: 255 })
  email!: string;

  @ManyToOne('Role')
  role!: Role;

  /** SHA-256 hex of the opaque invite token (never store plain token). */
  @Property({ length: 64 })
  tokenHash!: string;

  @Property({ type: 'timestamptz' })
  expiresAt!: Date;

  @Enum({ items: () => InvitationStatus, default: InvitationStatus.PENDING })
  status: InvitationStatus = InvitationStatus.PENDING;

  @ManyToOne('User', { nullable: true })
  invitedBy?: User;
}
