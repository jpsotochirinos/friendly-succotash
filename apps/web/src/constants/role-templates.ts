/** All permission codes (must match API / DB). Order matches logical grouping. */
export const ALL_PERMISSION_CODES = [
  'trackable:create',
  'trackable:read',
  'trackable:update',
  'trackable:delete',
  'workflow_item:create',
  'workflow_item:read',
  'workflow_item:update',
  'workflow_item:delete',
  'workflow_item:comment',
  'workflow_template:read',
  'workflow_template:manage',
  'document:create',
  'document:read',
  'document:update',
  'document:delete',
  'folder:create',
  'folder:read',
  'folder:update',
  'folder:delete',
  'user:create',
  'user:read',
  'user:update',
  'user:delete',
  'workflow:assign',
  'workflow:review',
  'workflow:validate',
  'workflow:close',
  'workflow:reject',
  'workflow:skip',
  'org:manage',
  'role:manage',
  'scraping:trigger',
  'sinoe:manage',
  'import:manage',
  'feed:read',
  'feed:manage',
] as const;

export type RoleTemplateId = 'full_admin' | 'senior_operator' | 'junior_operator' | 'read_only';

export const ROLE_TEMPLATE_IDS: RoleTemplateId[] = [
  'full_admin',
  'senior_operator',
  'junior_operator',
  'read_only',
];

/** Resolve which permission codes each fixed template includes. */
export function codesForTemplate(id: RoleTemplateId): string[] {
  const all = [...ALL_PERMISSION_CODES];
  switch (id) {
    case 'full_admin':
      return all;
    case 'senior_operator':
      return all.filter(
        (c) => c !== 'org:manage' && c !== 'role:manage' && c !== 'import:manage',
      );
    case 'junior_operator':
      return all.filter(
        (c) =>
          c.includes(':read') ||
          c.includes(':create') ||
          c === 'workflow:review' ||
          c === 'workflow_item:comment',
      );
    case 'read_only':
      return all.filter((c) => c.endsWith(':read') || c === 'workflow_template:read');
    default:
      return [];
  }
}

export function permissionLabelKey(code: string): string {
  return `rolesAdmin.perm.${code.replace(/:/g, '_')}`;
}

export function categoryLabelKey(category: string): string {
  return `rolesAdmin.category.${category}`;
}
