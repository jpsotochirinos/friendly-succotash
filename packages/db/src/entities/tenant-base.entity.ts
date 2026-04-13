import { ManyToOne, Filter, Property } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import type { Organization } from './organization.entity';

@Filter({
  name: 'tenant',
  cond: ({ organizationId }: { organizationId: string }) => ({
    organization: { id: organizationId },
  }),
  default: true,
})
export abstract class TenantBaseEntity extends BaseEntity {
  @ManyToOne('Organization', { nullable: false })
  organization!: Organization;
}
