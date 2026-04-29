<script setup lang="ts">
import { ref, computed } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';

const route = useRoute();
const isDark = ref(document.documentElement.classList.contains('dark'));
const sidebarOpen = ref(false);

function toggleTheme() {
  isDark.value = !isDark.value;
  document.documentElement.classList.toggle('dark', isDark.value);
}

interface NavGroup {
  label: string;
  icon: string;
  links: { to: string; label: string }[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Foundations',
    icon: 'pi-palette',
    links: [
      { to: '/sandbox/foundations/typography', label: 'Tipografía' },
      { to: '/sandbox/foundations/tokens', label: 'Tokens' },
      { to: '/sandbox/foundations/layout', label: 'Layout' },
    ],
  },
  {
    label: 'Componentes',
    icon: 'pi-box',
    links: [
      { to: '/sandbox/components/button', label: 'Button' },
      { to: '/sandbox/components/selectbutton-toggle', label: 'SelectButton · Toggle' },
      { to: '/sandbox/components/tooltip', label: 'Tooltip' },
      { to: '/sandbox/components/loading', label: 'Loading (Skeleton…)' },
      { to: '/sandbox/components/tag-chip-badge', label: 'Tag · Chip · Badge' },
      { to: '/sandbox/components/avatar', label: 'Avatar' },
      { to: '/sandbox/components/menu-popover', label: 'Menu · Popover' },
      { to: '/sandbox/components/feedback', label: 'Toast · Message' },
      { to: '/sandbox/components/inputs', label: 'Inputs' },
      { to: '/sandbox/components/select', label: 'Select · Dropdown' },
      { to: '/sandbox/components/toggle', label: 'Checkbox · Switch' },
      { to: '/sandbox/components/calendar', label: 'Calendar' },
      { to: '/sandbox/components/slider', label: 'Slider · ColorPicker' },
      { to: '/sandbox/components/confirm-dialog', label: 'ConfirmDialog' },
      { to: '/sandbox/components/dialog', label: 'Dialog (form)' },
      { to: '/sandbox/components/informational-dialog', label: 'Informational dialog' },
    ],
  },
  {
    label: 'Patrones',
    icon: 'pi-sparkles',
    links: [
      { to: '/sandbox/patterns/type-chip', label: 'Type-chip' },
      { to: '/sandbox/patterns/kpi-card', label: 'KPI Card' },
      { to: '/sandbox/patterns/activity-stat', label: 'Activity-stat' },
      { to: '/sandbox/patterns/misc-pills', label: 'Misc pills · Empty' },
    ],
  },
  {
    label: 'Recetas',
    icon: 'pi-objects-column',
    links: [
      { to: '/sandbox/recipes/trackables-cockpit', label: 'Cockpit (expedientes)' },
      { to: '/sandbox/recipes/data-table-functional', label: 'Tabla funcional' },
      { to: '/sandbox/recipes/data-table-informational', label: 'Tabla informativa' },
      { to: '/sandbox/recipes/calendar-redesign', label: 'Calendario rediseñado' },
    ],
  },
];

const isActive = (path: string) => route.path === path;
const currentGroupLabel = computed(() => {
  for (const group of navGroups) {
    if (group.links.some((l) => l.to === route.path)) return group.label;
  }
  return route.path === '/sandbox' ? 'Inicio' : '';
});
</script>

<template>
  <div class="min-h-screen flex flex-col" style="background: var(--surface-app); color: var(--fg-default);">
    <Toast />
    <ConfirmDialog />

    <!-- Top bar -->
    <header
      class="shrink-0 flex items-center gap-3 px-4 h-12 border-b z-20 relative"
      style="background: var(--surface-raised); border-color: var(--surface-border);"
    >
      <!-- Logo + breadcrumb -->
      <RouterLink
        to="/sandbox"
        class="flex items-center gap-2 font-semibold text-sm shrink-0"
        style="color: var(--fg-default); text-decoration: none;"
        @click="sidebarOpen = false"
      >
        <span style="color: var(--accent); font-weight: 700; font-size: 1.1rem;">⬡</span>
        Sandbox
      </RouterLink>

      <span style="color: var(--surface-border-strong); user-select: none; font-size: 0.75rem;">/</span>

      <span class="text-xs font-medium" style="color: var(--fg-muted);">{{ currentGroupLabel }}</span>

      <div class="flex-1" />

      <!-- Hamburger for sidebar (small screens) -->
      <button
        type="button"
        class="h-8 w-8 rounded-md flex items-center justify-center text-sm transition-colors sm:hidden"
        style="color: var(--fg-muted); background: none; border: none; cursor: pointer;"
        :aria-label="sidebarOpen ? 'Cerrar menú' : 'Abrir menú'"
        @click="sidebarOpen = !sidebarOpen"
      >
        <i :class="sidebarOpen ? 'pi pi-times' : 'pi pi-bars'" />
      </button>

      <!-- Dark mode toggle -->
      <button
        type="button"
        class="h-7 w-7 rounded-md flex items-center justify-center text-sm transition-colors hover:bg-[var(--surface-sunken)]"
        style="color: var(--fg-muted); background: none; border: none; cursor: pointer;"
        :title="isDark ? 'Cambiar a claro' : 'Cambiar a oscuro'"
        @click="toggleTheme"
      >
        <i :class="isDark ? 'pi pi-sun' : 'pi pi-moon'" />
      </button>

      <span class="text-xs hidden sm:block shrink-0" style="color: var(--fg-subtle);">Sin login · Sin API</span>
    </header>

    <!-- Layout: sidebar + content -->
    <div class="flex flex-1 min-h-0 overflow-hidden relative">

      <!-- Sidebar overlay (mobile) -->
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-10 sm:hidden"
        style="background: rgba(0,0,0,0.35);"
        @click="sidebarOpen = false"
      />

      <!-- Sidebar -->
      <aside
        class="shrink-0 flex flex-col overflow-y-auto border-r transition-all"
        :class="sidebarOpen ? 'fixed inset-y-12 left-0 z-20 w-64' : 'fixed -left-64 sm:static sm:left-0 w-56'"
        style="background: var(--surface-raised); border-color: var(--surface-border);"
      >
        <!-- Inicio link -->
        <div class="px-3 pt-4 pb-2">
          <RouterLink
            to="/sandbox"
            class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium no-underline transition-colors w-full"
            :class="route.path === '/sandbox'
              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
              : 'text-[var(--fg-muted)] hover:text-[var(--fg-default)] hover:bg-[var(--surface-sunken)]'"
            @click="sidebarOpen = false"
          >
            <i class="pi pi-home text-[11px]" />
            Catálogo
          </RouterLink>
        </div>

        <!-- Nav groups -->
        <nav class="flex flex-col gap-1 px-3 pb-6">
          <template v-for="group in navGroups" :key="group.label">
            <!-- Group label -->
            <div class="flex items-center gap-1.5 pt-4 pb-1 px-2">
              <i :class="`pi ${group.icon} text-[10px]`" style="color: var(--fg-subtle);" />
              <span
                class="text-[0.625rem] font-semibold uppercase tracking-[0.1em]"
                style="color: var(--fg-subtle);"
              >{{ group.label }}</span>
            </div>

            <!-- Links in group -->
            <RouterLink
              v-for="link in group.links"
              :key="link.to"
              :to="link.to"
              class="px-2.5 py-1.5 rounded-lg text-xs font-medium no-underline transition-colors block whitespace-nowrap overflow-hidden text-ellipsis"
              :class="isActive(link.to)
                ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'text-[var(--fg-muted)] hover:text-[var(--fg-default)] hover:bg-[var(--surface-sunken)]'"
              @click="sidebarOpen = false"
            >
              {{ link.label }}
            </RouterLink>
          </template>
        </nav>
      </aside>

      <!-- Main content -->
      <main class="flex-1 min-w-0 overflow-y-auto">
        <div class="max-w-5xl mx-auto px-6 py-6 sm:px-8 sm:py-8">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>
