export interface SidebarNavItem {
  to: string;
  label: string;
  icon: string;
}

/**
 * Default sidebar links for the current user (permissions align with Nest routes).
 */
export function getDefaultSidebarNavItems(
  t: (key: string) => string,
  can: (permission: string) => boolean,
  migrationVisible: boolean,
): SidebarNavItem[] {
  const items: SidebarNavItem[] = [{ to: '/', label: t('nav.home'), icon: 'pi pi-home' }];
  if (can('trackable:create') && migrationVisible) {
    items.push({ to: '/import', label: t('nav.import'), icon: 'pi pi-cloud-upload' });
  }
  if (can('trackable:read')) {
    items.push(
      { to: '/trackables', label: t('nav.trackables'), icon: 'pi pi-list' },
      { to: '/notifications', label: t('nav.notifications'), icon: 'pi pi-inbox' },
    );
  }
  if (can('feed:read')) {
    items.push({ to: '/novedades', label: t('nav.feed'), icon: 'pi pi-megaphone' });
  }
  if (can('trackable:read')) {
    items.push(
      { to: '/clients', label: t('nav.clients'), icon: 'pi pi-users' },
      { to: '/calendar', label: t('nav.calendar'), icon: 'pi pi-calendar' },
    );
  }
  if (can('document:read')) {
    items.push(
      { to: '/reviews', label: t('nav.reviews'), icon: 'pi pi-check-square' },
      { to: '/templates', label: t('nav.templates'), icon: 'pi pi-file' },
    );
  }
  return items;
}

/** Legacy trash path from bookmarks / saved nav order. */
const TRASH_ROUTE_ALIASES: Record<string, string> = {
  '/trash': '/trackables?scope=trash',
};

/** Apply saved route order; unknown routes keep default relative order at the end. */
export function applySidebarNavOrder(
  baseItems: SidebarNavItem[],
  savedOrder: string[],
): SidebarNavItem[] {
  if (!savedOrder.length) return baseItems;
  const normalizedOrder = savedOrder.map((to) => TRASH_ROUTE_ALIASES[to] ?? to);
  const byTo = new Map(baseItems.map((i) => [i.to, i]));
  const ordered: SidebarNavItem[] = [];
  for (const to of normalizedOrder) {
    const item = byTo.get(to);
    if (item) {
      ordered.push(item);
      byTo.delete(to);
    }
  }
  for (const item of baseItems) {
    if (byTo.has(item.to)) ordered.push(item);
  }
  return ordered;
}
