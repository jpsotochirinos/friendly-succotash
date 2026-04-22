import { computed } from 'vue';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissions } from '@/composables/usePermissions';

export function useMigrationVisibility() {
  const auth = useAuthStore();
  const { can } = usePermissions();

  const isCompleted = computed(
    () => auth.organization?.onboardingState?.migrationCompleted === true,
  );

  const showInMainSidebar = computed(() => can('import:manage') && !isCompleted.value);

  const showInSettings = computed(() => can('import:manage'));

  async function dismiss() {
    await apiClient.patch('/organizations/me', {
      onboardingState: { migrationCompleted: true },
    });
    await auth.fetchMyOrganization();
  }

  return { isCompleted, showInMainSidebar, showInSettings, dismiss };
}
