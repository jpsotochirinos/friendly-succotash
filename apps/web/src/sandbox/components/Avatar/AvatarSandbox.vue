<script setup lang="ts">
import Avatar from 'primevue/avatar';
import AvatarGroup from 'primevue/avatargroup';
import ExampleFrame from '../../_shared/ExampleFrame.vue';

/**
 * Hash determinista del nombre → color de avatar.
 * Extraído de TrackablesCockpitSandbox y expuesto como función utilitaria reutilizable.
 * Candidato a mover a apps/web/src/utils/avatarColor.ts.
 */
function hashAvatarColor(name: string): string {
  const palette = [
    '#3b5bdb', // indigo
    '#0ca678', // teal
    '#e67700', // orange
    '#862e9c', // purple
    '#1971c2', // blue
    '#c92a2a', // red
    '#2f9e44', // green
    '#5f3dc4', // violet
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  }
  return palette[hash % palette.length];
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

const users = [
  { id: 'u1', name: 'Carlos Mendoza' },
  { id: 'u2', name: 'Ana Torres' },
  { id: 'u3', name: 'Luis Paredes' },
  { id: 'u4', name: 'Sofía Vega' },
  { id: 'u5', name: 'Ricardo Flores' },
];

const codeHashAvatar = `// utils/avatarColor.ts — función utilitaria reutilizable
export function hashAvatarColor(name: string): string {
  const palette = [
    '#3b5bdb', '#0ca678', '#e67700', '#862e9c',
    '#1971c2', '#c92a2a', '#2f9e44', '#5f3dc4',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  }
  return palette[hash % palette.length];
}

export function initials(name: string): string {
  return name.split(' ').slice(0, 2)
    .map((w) => w[0]).join('').toUpperCase();
}`;

const codeUsage = `<!-- Avatar en fila de tabla / cockpit -->
<div
  class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
  :style="{ background: hashAvatarColor(user.name), color: '#fff' }"
  :aria-label="user.name"
  v-tooltip.top="user.name"
>
  {{ initials(user.name) }}
</div>

<!-- Sin asignar -->
<div
  class="w-9 h-9 rounded-full flex items-center justify-center"
  style="background: var(--surface-sunken); border: 1.5px dashed var(--surface-border);"
  v-tooltip.top="'Sin asignar'"
  aria-label="Sin asignar"
>
  <i class="pi pi-user-plus text-sm" style="color: var(--fg-subtle);" />
</div>`;

const antiPatterns = [
  { bad: 'Avatar sin aria-label ni v-tooltip cuando es un elemento interactivo', good: 'Siempre aria-label con el nombre completo. v-tooltip para hover.' },
  { bad: 'Iniciales de > 2 caracteres', good: 'Máximo 2 caracteres (nombre + apellido). Reducir a 1 si el nombre es corto.' },
  { bad: 'Avatar de 16px', good: 'Mínimo 24px. Para texto legible usar 32px o más.' },
  { bad: 'Color de avatar fijo sin diferenciación', good: 'Hash determinista por nombre — mismo usuario siempre tiene el mismo color.' },
  { bad: 'AvatarGroup sin cap de overflow', good: 'Máximo 3-4 visibles + "+N" para el resto.' },
];
</script>

<template>
  <div class="flex flex-col gap-10">
    <!-- Page header -->
    <div>
      <p class="text-xs font-semibold uppercase tracking-widest mb-1" style="color: var(--fg-subtle);">
        Componentes / Avatar
      </p>
      <h1 class="text-2xl font-semibold m-0" style="color: var(--fg-default);">Avatar & AvatarGroup</h1>
      <p class="text-sm mt-1 m-0" style="color: var(--fg-muted);">
        Representación visual de usuarios. Alega usa avatares de iniciales con color hash determinista — mismo nombre siempre mismo color.
      </p>
    </div>

    <!-- hashAvatarColor utility -->
    <ExampleFrame
      title="Hash de color determinista"
      description="La función hashAvatarColor() asigna un color consistente por nombre. El mismo usuario siempre tiene el mismo color independientemente del contexto."
      :code="codeHashAvatar"
    >
      <div class="flex flex-wrap gap-4 items-start">
        <div
          v-for="user in users"
          :key="user.id"
          class="flex flex-col items-center gap-2"
        >
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white"
            :style="{ background: hashAvatarColor(user.name) }"
            :aria-label="user.name"
            v-tooltip.top="user.name"
          >
            {{ initials(user.name) }}
          </div>
          <span class="text-[10px] text-center" style="color: var(--fg-subtle); max-width: 70px;">{{ user.name }}</span>
          <code class="text-[9px] font-mono" style="color: var(--fg-subtle);">{{ hashAvatarColor(user.name) }}</code>
        </div>
      </div>
    </ExampleFrame>

    <!-- Tamaños -->
    <ExampleFrame
      title="Tamaños de avatar"
      description="24 / 32 / 40 / 48px. Usar 32 para filas de tabla y opciones de dropdown; 40 para detalle y perfiles."
      :code="codeUsage"
    >
      <div class="flex items-end gap-6">
        <div
          v-for="size in [24, 32, 40, 48]"
          :key="size"
          class="flex flex-col items-center gap-2"
        >
          <div
            class="rounded-full flex items-center justify-center font-semibold text-white"
            :style="{
              width: `${size}px`,
              height: `${size}px`,
              background: hashAvatarColor('Carlos Mendoza'),
              fontSize: `${Math.round(size * 0.38)}px`,
            }"
            aria-label="Carlos Mendoza"
            v-tooltip.top="'Carlos Mendoza'"
          >
            CM
          </div>
          <span class="text-[10px]" style="color: var(--fg-subtle);">{{ size }}px</span>
        </div>

        <!-- Sin asignar -->
        <div class="flex flex-col items-center gap-2">
          <div
            class="w-9 h-9 rounded-full flex items-center justify-center"
            style="background: var(--surface-sunken); border: 1.5px dashed var(--surface-border);"
            v-tooltip.top="'Sin asignar'"
            aria-label="Sin asignar"
          >
            <i class="pi pi-user-plus text-sm" style="color: var(--fg-subtle);" />
          </div>
          <span class="text-[10px]" style="color: var(--fg-subtle);">Sin asignar</span>
        </div>
      </div>
    </ExampleFrame>

    <!-- PrimeVue Avatar variants -->
    <ExampleFrame
      title="PrimeVue Avatar — con iniciales, icono, imagen"
      description="El componente Avatar de PrimeVue. Usar cuando no se necesita el color hash (ej. en contextos de Avatar agrupado sin datos de usuario)."
    >
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex flex-col items-center gap-2">
          <Avatar label="CM" style="background: #3b5bdb; color: #fff;" size="large" shape="circle" />
          <span class="text-[10px]" style="color: var(--fg-subtle);">Iniciales</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <Avatar icon="pi pi-user" size="large" shape="circle" />
          <span class="text-[10px]" style="color: var(--fg-subtle);">Icono fallback</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <Avatar
            image="https://primefaces.org/cdn/primevue/images/avatar/amyelsner.png"
            size="large"
            shape="circle"
          />
          <span class="text-[10px]" style="color: var(--fg-subtle);">Con imagen</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <Avatar label="AT" shape="square" size="large" style="background: #0ca678; color: #fff;" />
          <span class="text-[10px]" style="color: var(--fg-subtle);">Square</span>
        </div>
      </div>
    </ExampleFrame>

    <!-- AvatarGroup -->
    <ExampleFrame
      title="AvatarGroup — equipo del expediente"
      description="Máximo 3-4 avatares visibles. El +N muestra el resto. Cada avatar lleva v-tooltip con el nombre."
    >
      <div class="flex flex-col gap-6">
        <!-- Stack con PrimeVue AvatarGroup -->
        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold" style="color: var(--fg-subtle);">PrimeVue AvatarGroup</span>
          <AvatarGroup>
            <Avatar label="CM" shape="circle" style="background: #3b5bdb; color: #fff;" v-tooltip.top="'Carlos Mendoza'" />
            <Avatar label="AT" shape="circle" style="background: #0ca678; color: #fff;" v-tooltip.top="'Ana Torres'" />
            <Avatar label="LP" shape="circle" style="background: #e67700; color: #fff;" v-tooltip.top="'Luis Paredes'" />
            <Avatar label="+2" shape="circle" style="background: var(--surface-sunken); color: var(--fg-muted); border: 1px solid var(--surface-border);" v-tooltip.top="'Sofía Vega, Ricardo Flores'" />
          </AvatarGroup>
        </div>

        <!-- Watchers sobre KPI card (custom overlay) -->
        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold" style="color: var(--fg-subtle);">Watchers en KPI card (custom CSS)</span>
          <div class="flex">
            <div
              v-for="(user, idx) in users.slice(0, 4)"
              :key="user.id"
              class="rounded-full flex items-center justify-center text-xs font-semibold text-white"
              :style="{
                width: '28px',
                height: '28px',
                background: hashAvatarColor(user.name),
                marginLeft: idx === 0 ? '0' : '-8px',
                zIndex: users.length - idx,
                border: '2px solid var(--surface-raised)',
              }"
              v-tooltip.top="user.name"
              :aria-label="user.name"
            >
              {{ initials(user.name) }}
            </div>
          </div>
        </div>

        <!-- En option de Dropdown -->
        <div class="flex flex-col gap-2">
          <span class="text-xs font-semibold" style="color: var(--fg-subtle);">Patrón en opciones de Dropdown (abogado asignado)</span>
          <div
            v-for="user in users.slice(0, 3)"
            :key="user.id"
            class="flex items-center gap-3 px-3 py-2 rounded-lg"
            style="background: var(--surface-sunken); border: 1px solid var(--surface-border);"
          >
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
              :style="{ background: hashAvatarColor(user.name) }"
            >
              {{ initials(user.name) }}
            </div>
            <span class="text-sm" style="color: var(--fg-default);">{{ user.name }}</span>
          </div>
        </div>
      </div>
    </ExampleFrame>

    <!-- Anti-patterns -->
    <div class="flex flex-col gap-3">
      <h2 class="text-base font-semibold m-0" style="color: var(--fg-default);">Anti-patrones</h2>
      <div class="rounded-xl overflow-hidden" style="border: 1px solid var(--surface-border);">
        <table class="w-full text-xs">
          <thead>
            <tr style="background: var(--surface-sunken); border-bottom: 1px solid var(--surface-border);">
              <th class="text-left px-4 py-2 font-semibold" style="color: var(--fg-muted);">Anti-patrón</th>
              <th class="text-left px-4 py-2 font-semibold" style="color: var(--fg-muted);">Corrección</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in antiPatterns" :key="i" style="border-bottom: 1px solid var(--surface-border);">
              <td class="px-4 py-2.5" style="color: #dc2626;">{{ row.bad }}</td>
              <td class="px-4 py-2.5" style="color: var(--fg-default);">{{ row.good }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex flex-wrap gap-4 text-xs" style="color: var(--fg-muted);">
      <a href="https://primevue.org/avatar/" target="_blank" rel="noopener" class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors" style="color: var(--fg-muted);"><i class="pi pi-external-link text-[10px]" /> Docs PrimeVue Avatar</a>
      <span>·</span>
      <span>Patrón en: <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">recipes/TrackablesCockpit/TrackablesCockpitSandbox.vue L644</code></span>
    </div>
  </div>
</template>
