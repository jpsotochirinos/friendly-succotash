<template>
  <div class="flex flex-col lg:flex-row gap-8 lg:gap-12 -mx-2 sm:-mx-4">
    <nav
      class="shrink-0 lg:w-56 space-y-0.5"
      :aria-label="t('settings.title')"
    >
      <p class="text-xs font-semibold uppercase tracking-wide mb-3 px-2 text-fg-subtle">
        {{ t('settings.title') }}
      </p>
      <RouterLink
        v-for="item in visibleNavItems"
        :key="item.to"
        :to="item.to"
        custom
        v-slot="{ href, navigate, isActive }"
      >
        <a
          :href="href"
          class="settings-nav-item block rounded-lg px-3 py-2.5 text-sm transition-colors text-fg"
          :class="isActive ? 'is-active' : ''"
          @click="(e) => { navigate(e); }"
        >
          {{ item.label }}
        </a>
      </RouterLink>
    </nav>

    <div class="flex-1 min-w-0 pb-8">
      <RouterView v-slot="{ Component }">
        <Transition name="view-fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { apiClient } from '@/api/client';

const { t } = useI18n();

const permissions = ref<string[]>([]);

onMounted(async () => {
  try {
    const { data } = await apiClient.get('/auth/me');
    permissions.value = Array.isArray(data?.permissions) ? data.permissions : [];
  } catch {
    permissions.value = [];
  }
});

const canUserRead = computed(() => permissions.value.includes('user:read'));
const canRoleManage = computed(() => permissions.value.includes('role:manage'));
const canSinoe = computed(() => permissions.value.includes('sinoe:manage'));
const canWhatsApp = computed(() => permissions.value.includes('trackable:read'));
const canCalendarSettings = computed(() => permissions.value.includes('trackable:read'));
const canWorkflowRules = computed(() => permissions.value.includes('workflow:update'));
const canWorkflowDefinitions = computed(() => permissions.value.includes('workflow:update'));
const canBillingRead = computed(() => permissions.value.includes('billing:read'));
const canImportManage = computed(() => permissions.value.includes('import:manage'));
const canFeedManage = computed(() => permissions.value.includes('feed:manage'));

const allNavItems = computed(() => [
  { to: '/settings/general', label: t('settings.sections.general'), show: true },
  { to: '/settings/account', label: t('settings.sections.account'), show: true },
  { to: '/settings/migration', label: t('settings.sections.migration'), show: canImportManage.value },
  { to: '/settings/calendar', label: t('settings.sections.calendar'), show: canCalendarSettings.value },
  { to: '/settings/sinoe', label: t('settings.sections.sinoe'), show: canSinoe.value },
  { to: '/settings/whatsapp', label: t('settings.sections.whatsapp'), show: canWhatsApp.value },
  { to: '/settings/privacy', label: t('settings.sections.privacy'), show: true },
  { to: '/settings/billing', label: t('settings.sections.billing'), show: canBillingRead.value },
  { to: '/settings/credits', label: t('settings.sections.credits'), show: canBillingRead.value },
  { to: '/settings/plan', label: t('settings.sections.plan'), show: canBillingRead.value },
  { to: '/settings/users', label: t('settings.sections.users'), show: canUserRead.value },
  { to: '/settings/roles', label: t('settings.sections.roles'), show: canRoleManage.value },
  { to: '/settings/feed-sources', label: t('settings.sections.feedSources'), show: canFeedManage.value },
  { to: '/settings/workflow-templates', label: t('settings.sections.flowTemplates'), show: true },
  { to: '/settings/workflows', label: t('settings.sections.workflowDefinitions'), show: canWorkflowDefinitions.value },
  { to: '/settings/workflow-rules', label: t('settings.sections.workflowRules'), show: canWorkflowRules.value },
]);

const visibleNavItems = computed(() => allNavItems.value.filter((i) => i.show));
</script>

<style scoped>
.settings-nav-item.is-active {
  background-color: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}
.settings-nav-item:not(.is-active):hover {
  background-color: var(--surface-sunken);
}
html.dark .settings-nav-item.is-active {
  color: var(--brand-hielo);
}
</style>
