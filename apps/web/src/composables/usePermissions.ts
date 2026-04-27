import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Permission matrix (align with Nest controllers):
 * - trackable:* → trackables, clients list/actions
 * - document:read | create | update | delete → folders tree, documents list, editor read vs edit
 * - workflow_item:* → ExpedienteView, workflow dialogs (passed as props there)
 * - user:*, role:manage → settings
 * - workflow:assign|review|validate|close|reject|skip → flow actions
 * - org:manage, scraping:trigger → settings / scraping
 * - import:manage → data migration / import batches (typically Owner; assignable in Roles)
 * - calendar:read | view_team | integration:manage → calendario global e integraciones
 * - feed:read | feed:manage → página Novedades y administración de fuentes RSS
 */
export function usePermissions() {
  const authStore = useAuthStore();
  const { user } = storeToRefs(authStore);

  const permissions = computed(() => {
    const p = user.value?.permissions;
    return Array.isArray(p) ? p : [];
  });

  function can(code: string): boolean {
    return permissions.value.includes(code);
  }

  function canAny(...codes: string[]): boolean {
    return codes.some((c) => permissions.value.includes(c));
  }

  function canAll(...codes: string[]): boolean {
    return codes.every((c) => permissions.value.includes(c));
  }

  return { permissions, can, canAny, canAll };
}
