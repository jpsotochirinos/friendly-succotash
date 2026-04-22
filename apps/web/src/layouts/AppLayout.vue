<template>
  <div class="h-full min-h-0 flex overflow-hidden app-surface transition-colors">
    <aside
      :class="collapsed ? 'w-20' : 'w-64'"
      class="app-layout-sidebar relative flex h-full min-h-0 flex-col shrink-0 transition-[width] duration-300 ease-out text-fg"
    >
      <div
        class="app-layout-sidebar-header shrink-0 flex items-center"
        :class="
          collapsed
            ? 'flex-row items-center justify-between gap-1 px-2 py-3'
            : 'justify-between gap-2 px-4 py-4'
        "
      >
        <RouterLink
          to="/"
          class="flex min-w-0 rounded-lg outline-none focus-visible:ring-2 transition-colors text-fg"
          :class="
            collapsed
              ? 'h-7 w-7 shrink-0 items-center justify-center rounded-lg p-0 hover:!bg-[var(--surface-sunken)]'
              : 'items-center'
          "
          :title="collapsed ? 'Alega — inicio' : undefined"
          aria-label="Alega"
        >
          <AppLogo :variant="collapsed ? 'mark' : 'wordmark'" :size="collapsed ? 'sm' : 'md'" />
        </RouterLink>

        <button
          type="button"
          class="shrink-0 rounded-lg transition-colors focus-visible:ring-2 text-fg-muted"
          :class="
            collapsed
              ? 'flex h-7 w-7 items-center justify-center rounded-lg p-0 hover:!bg-[var(--accent-soft)]'
              : 'p-2 hover:!bg-[var(--accent-soft)]'
          "
          :aria-expanded="!collapsed"
          :aria-label="collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'"
          @click="toggleCollapse"
        >
          <i
            class="pi pointer-events-none text-sm"
            :class="collapsed ? 'pi-angle-double-right' : 'pi-angle-double-left'"
            aria-hidden="true"
          />
        </button>
      </div>

      <nav
        class="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-4 space-y-1"
        aria-label="Navegación principal"
      >
        <RouterLink
          v-for="item in orderedNavItems"
          :key="item.to"
          :to="item.to"
          :title="collapsed ? item.label : undefined"
          custom
          v-slot="{ href, navigate, isActive, isExactActive }"
        >
          <a
            :href="href"
            class="nav-item relative"
            :class="[
              navItemActive(item.to, isActive, isExactActive) ? 'is-active' : '',
              collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
            ]"
            @click="navigate"
          >
            <i :class="[item.icon, 'text-[17px]']" aria-hidden="true" />
            <span v-show="!collapsed" class="whitespace-nowrap overflow-hidden flex-1 min-w-0">{{
              item.label
            }}</span>
            <span
              v-if="!collapsed && item.to === '/novedades' && feedUnreadCount > 0"
              class="shrink-0 min-w-[1.25rem] h-5 px-1 rounded-full text-[10px] font-semibold flex items-center justify-center bg-accent text-white"
              aria-label="Novedades sin leer"
            >
              {{ feedUnreadCount > 99 ? '99+' : feedUnreadCount }}
            </span>
            <span
              v-else-if="collapsed && item.to === '/novedades' && feedUnreadCount > 0"
              class="absolute top-1 right-1 h-2 w-2 rounded-full bg-accent"
              aria-hidden="true"
            />
            <button
              v-if="!collapsed && item.to === '/import'"
              type="button"
              class="shrink-0 ml-1 rounded p-1 text-fg-muted hover:text-fg hover:!bg-[var(--surface-sunken)] focus-visible:ring-2 outline-none"
              :title="t('nav.importDismissFromSidebar')"
              :aria-label="t('nav.importDismissFromSidebar')"
              @click.stop.prevent="dismissMigrationFromSidebar"
            >
              <i class="pi pi-times text-xs" aria-hidden="true" />
            </button>
          </a>
        </RouterLink>
      </nav>

      <div class="app-layout-sidebar-footer shrink-0 px-3 py-3 space-y-2">
        <button
          type="button"
          class="app-layout-user-chip w-full flex items-center rounded-lg transition-colors outline-none focus-visible:ring-2 text-left"
          :class="collapsed ? 'justify-center p-2' : 'gap-3 px-2 py-2'"
          :aria-expanded="userMenuOpen"
          aria-haspopup="true"
          :title="collapsed ? t('userMenu.openMenu') : undefined"
          @click="toggleUserMenu"
        >
          <div
            class="h-8 w-8 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 bg-accent-soft text-accent ring-1 ring-brand-zafiro/15 dark:ring-brand-hielo/20"
          >
            {{ userInitials }}
          </div>
          <div v-show="!collapsed" class="flex-1 min-w-0 leading-tight">
            <div class="text-sm font-medium truncate text-fg">{{ userName }}</div>
            <div class="text-xs truncate text-fg-subtle">{{ userEmail }}</div>
          </div>
          <i
            v-show="!collapsed"
            class="pi pi-angle-up text-xs shrink-0 opacity-60"
            aria-hidden="true"
          />
        </button>

        <Popover
          ref="userMenuPanel"
          class="user-account-panel min-w-[240px] border border-surface-border bg-surface-raised shadow-lg rounded-xl overflow-hidden"
          @show="userMenuOpen = true"
          @hide="userMenuOpen = false"
        >
          <div class="px-3 pt-3 pb-2">
            <p class="text-xs break-all text-fg-subtle">{{ userEmail }}</p>
          </div>
          <hr class="mx-2 my-0 border-0 h-px bg-surface-border" />
          <button
            type="button"
            class="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left text-fg transition-colors rounded-none hover:!bg-[var(--surface-sunken)]"
            @click="goSettings"
          >
            <i class="pi pi-cog text-base" aria-hidden="true" />
            {{ t('nav.settings') }}
          </button>
          <button
            type="button"
            class="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left text-fg transition-colors rounded-none hover:!bg-[var(--surface-sunken)]"
            :aria-label="themeButtonLabel"
            :title="themeButtonLabel"
            @click="cycleTheme"
          >
            <i :class="['pi text-base', themeIcon]" aria-hidden="true" />
            <span class="flex-1">{{ t('userMenu.theme') }}</span>
            <span class="text-xs opacity-70 truncate max-w-[7rem] text-fg-muted">{{ themeModeLabelShort }}</span>
          </button>
          <hr class="mx-2 my-0 border-0 h-px bg-surface-border" />
          <button
            type="button"
            class="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left text-fg transition-colors rounded-none hover:!bg-[var(--surface-sunken)]"
            @click="logoutFromMenu"
          >
            <i class="pi pi-sign-out text-base" aria-hidden="true" />
            {{ t('nav.logout') }}
          </button>
        </Popover>
      </div>
    </aside>

    <main class="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface-app">
      <div
        class="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col overflow-y-auto overscroll-contain px-6 py-6 sm:px-8 sm:py-8"
      >
        <RouterView v-slot="{ Component, route }">
          <Transition name="view-fade" mode="out-in">
            <component :is="Component" :key="route.fullPath" class="min-h-0 flex flex-1 flex-col" />
          </Transition>
        </RouterView>
      </div>
    </main>

    <FloatingAssistant v-if="authStore.user" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Popover from 'primevue/popover';
import { useAuthStore } from '@/stores/auth.store';
import { useSidebarNavOrderStore } from '@/stores/sidebar-nav-order.store';
import { useTheme } from '@/composables/useTheme';
import { usePermissions } from '@/composables/usePermissions';
import { useMigrationVisibility } from '@/composables/useMigrationVisibility';
import { applySidebarNavOrder, getDefaultSidebarNavItems } from '@/navigation/sidebar-nav';
import AppLogo from '@/components/brand/AppLogo.vue';
import FloatingAssistant from '@/components/assistant/FloatingAssistant.vue';
import { useFeedUnread } from '@/composables/useFeedUnread';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { can } = usePermissions();
const { showInMainSidebar, dismiss: dismissMigrationFromSidebar } = useMigrationVisibility();
const sidebarNavOrderStore = useSidebarNavOrderStore();
const { mode: themeMode, isDark, cycle: cycleTheme } = useTheme();
const collapsed = ref(localStorage.getItem('sidebar-collapsed') === 'true');
const { unreadCount: feedUnreadCount } = useFeedUnread();

const userMenuPanel = ref<InstanceType<typeof Popover> | null>(null);
const userMenuOpen = ref(false);

const baseNavItems = computed(() => getDefaultSidebarNavItems(t, can, showInMainSidebar.value));

const orderedNavItems = computed(() =>
  applySidebarNavOrder(baseNavItems.value, sidebarNavOrderStore.order),
);

watch(
  () => authStore.user?.id,
  (id) => {
    if (id) sidebarNavOrderStore.hydrate();
    else sidebarNavOrderStore.clear();
  },
  { immediate: true },
);

/** La ruta `/` es padre de todas las hijas; `isActive` queda true siempre. Solo Inicio usa match exacto. */
function navItemActive(to: string, isActive: boolean, isExactActive: boolean) {
  if (to === '/') return isExactActive;
  if (to === '/trackables') {
    return route.path === '/trackables' && String(route.query.scope) !== 'trash';
  }
  if (to === '/import') {
    return route.path === '/import' || route.path.startsWith('/import/');
  }
  return isActive;
}

const themeModeLabelShort = computed(() => {
  switch (themeMode.value) {
    case 'light':
      return t('userMenu.themeLight');
    case 'dark':
      return t('userMenu.themeDark');
    default:
      return t('userMenu.themeSystem');
  }
});

function toggleUserMenu(event: Event) {
  userMenuPanel.value?.toggle(event);
}

function goSettings() {
  userMenuPanel.value?.hide();
  router.push({ name: 'settings-general' }).catch(() => {});
}

function logoutFromMenu() {
  userMenuPanel.value?.hide();
  authStore.logout();
}

function toggleCollapse() {
  collapsed.value = !collapsed.value;
  localStorage.setItem('sidebar-collapsed', String(collapsed.value));
}

const themeIcon = computed(() => {
  if (themeMode.value === 'system') return 'pi-desktop';
  return isDark.value ? 'pi-moon' : 'pi-sun';
});

const themeButtonLabel = computed(() => {
  switch (themeMode.value) {
    case 'light':
      return 'Tema claro (clic para oscuro)';
    case 'dark':
      return 'Tema oscuro (clic para sistema)';
    default:
      return 'Tema del sistema (clic para claro)';
  }
});

const userName = computed(() => {
  const u = authStore.user;
  return u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email : '';
});
const userEmail = computed(() => authStore.user?.email || '');
const userInitials = computed(() => {
  const u = authStore.user;
  if (!u) return '?';
  const f = u.firstName?.[0] || '';
  const l = u.lastName?.[0] || '';
  return (f + l).toUpperCase() || u.email[0].toUpperCase();
});
</script>
