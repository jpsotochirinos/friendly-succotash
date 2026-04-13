<template>
  <div class="min-h-screen flex bg-gray-50 dark:bg-gray-900 transition-colors">
    <aside
      :class="collapsed ? 'w-16' : 'w-64'"
      class="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300"
    >
      <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
        <button
          class="p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          @click="toggleCollapse"
        >
          <i class="pi pi-bars text-lg" />
        </button>
        <h1
          v-show="!collapsed"
          class="text-xl font-bold text-blue-600 whitespace-nowrap overflow-hidden"
        >
          Tracker
        </h1>
      </div>

      <nav class="flex-1 p-3 space-y-1">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :title="collapsed ? item.label : undefined"
          class="flex items-center rounded-lg text-sm font-medium transition-colors"
          :class="[
            $route.path === item.to
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white',
            collapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2',
          ]"
        >
          <i :class="item.icon" class="text-lg" />
          <span v-show="!collapsed" class="whitespace-nowrap overflow-hidden">
            {{ item.label }}
          </span>
        </router-link>
      </nav>

      <div class="p-3 border-t border-gray-200 dark:border-gray-700">
        <div
          class="flex items-center px-3 py-2"
          :class="collapsed ? 'justify-center' : 'gap-2'"
        >
          <div
            class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-semibold text-sm shrink-0"
            :title="collapsed ? userName : undefined"
          >
            {{ userInitials }}
          </div>
          <div v-show="!collapsed" class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ userName }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ userEmail }}</div>
          </div>
        </div>

        <div
          class="flex items-center mt-2"
          :class="collapsed ? 'justify-center' : 'gap-2'"
        >
          <button
            v-show="!collapsed"
            class="flex-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-left"
            @click="authStore.logout()"
          >
            Cerrar sesión
          </button>
          <button
            class="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            @click="toggleDarkMode"
            :title="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
          >
            <i :class="isDark ? 'pi pi-sun' : 'pi pi-moon'" />
          </button>
        </div>
      </div>
    </aside>

    <main class="flex-1 overflow-auto relative">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.store';

const authStore = useAuthStore();
const isDark = ref(false);
const collapsed = ref(localStorage.getItem('sidebar-collapsed') === 'true');

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: 'pi pi-chart-bar' },
  { to: '/trackables', label: 'Trackables', icon: 'pi pi-list' },
  { to: '/templates', label: 'Plantillas', icon: 'pi pi-file' },
  { to: '/roles', label: 'Roles', icon: 'pi pi-users' },
  { to: '/trash', label: 'Papelera', icon: 'pi pi-trash' },
];

function toggleCollapse() {
  collapsed.value = !collapsed.value;
  localStorage.setItem('sidebar-collapsed', String(collapsed.value));
}

function toggleDarkMode() {
  isDark.value = !isDark.value;
  document.documentElement.classList.toggle('dark', isDark.value);
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
}

onMounted(() => {
  const saved = localStorage.getItem('theme');
  isDark.value = saved === 'dark';
  document.documentElement.classList.toggle('dark', isDark.value);
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
