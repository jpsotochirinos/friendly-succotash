import { Filter } from '@mikro-orm/core';

export function TenantFilter() {
  return Filter({
    name: 'tenant',
    cond: ({ organizationId }: { organizationId: string }) => ({
      organization: { id: organizationId },
    }),
    default: true,
  });
}
