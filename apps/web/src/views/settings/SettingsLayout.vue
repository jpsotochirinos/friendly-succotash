<template>
  <div class="-mx-2 flex min-h-0 flex-1 flex-col gap-8 sm:-mx-4 lg:flex-row lg:gap-12">
    <nav
      class="shrink-0 space-y-0.5 lg:sticky lg:top-0 lg:z-10 lg:w-56 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto"
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
          class="settings-nav-item flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors text-fg"
          :class="isActive ? 'is-active' : ''"
          @click="(e) => { navigate(e); }"
        >
          <i :class="[item.icon, 'text-base opacity-80']" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </a>
      </RouterLink>
    </nav>

    <div class="min-h-0 min-w-0 flex-1 overflow-y-auto pb-8 lg:max-h-[calc(100vh-7rem)]">
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
const canBlueprint = computed(() => permissions.value.includes('blueprint:read'));
const canBillingRead = computed(() => permissions.value.includes('billing:read'));
const canImportManage = computed(() => permissions.value.includes('import:manage'));
const canFeedManage = computed(() => permissions.value.includes('feed:manage'));

const allNavItems = computed(() => [
  { to: '/settings/general', label: t('settings.sections.generalAccount'), icon: 'pi pi-user', show: true },
  { to: '/settings/blueprints', label: t('blueprint.title'), icon: 'pi pi-sitemap', show: canBlueprint.value },
  { to: '/settings/migration', label: t('settings.sections.migration'), icon: 'pi pi-upload', show: canImportManage.value },
  { to: '/settings/calendar', label: t('settings.sections.calendar'), icon: 'pi pi-calendar', show: canCalendarSettings.value },
  { to: '/settings/sinoe', label: t('settings.sections.sinoe'), icon: 'pi pi-cloud-download', show: canSinoe.value },
  { to: '/settings/whatsapp', label: t('settings.sections.whatsapp'), icon: 'pi pi-comments', show: canWhatsApp.value },
  { to: '/settings/privacy', label: t('settings.sections.privacy'), icon: 'pi pi-shield', show: true },
  { to: '/settings/subscription', label: t('settings.sections.subscriptionBilling'), icon: 'pi pi-credit-card', show: canBillingRead.value },
  { to: '/settings/users', label: t('settings.sections.users'), icon: 'pi pi-users', show: canUserRead.value },
  { to: '/settings/roles', label: t('settings.sections.roles'), icon: 'pi pi-lock', show: canRoleManage.value },
  { to: '/settings/feed-sources', label: t('settings.sections.feedSources'), icon: 'pi pi-rss', show: canFeedManage.value },
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
