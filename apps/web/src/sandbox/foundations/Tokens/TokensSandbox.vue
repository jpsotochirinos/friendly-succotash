<script setup lang="ts">
import { ref } from 'vue';
import ExampleFrame from '../../_shared/ExampleFrame.vue';

const localDark = ref(false);

function toggleDark() {
  localDark.value = !localDark.value;
  document.documentElement.classList.toggle('dark', localDark.value);
}

const brandTokens = [
  { name: '--brand-abismo', hex: '#0d0f2b', label: 'Abismo' },
  { name: '--brand-medianoche', hex: '#141852', label: 'Medianoche' },
  { name: '--brand-real', hex: '#1b2080', label: 'Real' },
  { name: '--brand-zafiro', hex: '#2d3fbf', label: 'Zafiro' },
  { name: '--brand-hielo', hex: '#c8ccf5', label: 'Hielo' },
  { name: '--brand-papel', hex: '#f2f3fb', label: 'Papel' },
];

const surfaceTokens = [
  { name: '--surface-app', label: 'App (fondo global)' },
  { name: '--surface-app-soft', label: 'App soft' },
  { name: '--surface-raised', label: 'Raised (cards, modals)' },
  { name: '--surface-sunken', label: 'Sunken (inputs, headers)' },
  { name: '--surface-border', label: 'Border (tenues)' },
  { name: '--surface-border-strong', label: 'Border strong' },
];

const fgTokens = [
  { name: '--fg-default', label: 'Default', sample: 'Texto principal' },
  { name: '--fg-muted', label: 'Muted', sample: 'Subtítulos y helpers' },
  { name: '--fg-subtle', label: 'Subtle', sample: 'Placeholders, captions' },
  { name: '--fg-on-brand', label: 'On brand', sample: 'Texto sobre Zafiro' },
];

const accentTokens = [
  { name: '--accent', label: 'Accent (primario)' },
  { name: '--accent-hover', label: 'Accent hover' },
  { name: '--accent-soft', label: 'Accent soft (bg de focus/badge)' },
  { name: '--accent-ring', label: 'Accent ring (outline focus)' },
];

const shadowTokens = [
  { name: '--shadow-sm', label: 'sm — separación mínima (modals internos)', sampleSize: 'h-12' },
  { name: '--shadow-md', label: 'md — cards, dropdowns', sampleSize: 'h-12' },
  { name: '--shadow-lg', label: 'lg — dialogs, popovers, menús', sampleSize: 'h-14' },
];

const statusColors = [
  { name: 'Success / Done', hex: '#10b981', label: 'emerald-500', use: 'Stepper círculo completado, tag success' },
  { name: 'Warning / Dirty', hex: '#d97706', label: 'amber-600', use: 'Dot dirty-state, tag warn' },
  { name: 'Danger / Error', hex: '#dc2626', label: 'red-600 (light)', use: 'Error inline, tag danger' },
  { name: 'Danger / Error dark', hex: '#fca5a5', label: 'red-300 (dark)', use: 'Error inline en dark mode' },
];

const radiusScale = [
  { label: 'rounded (4px)', class: 'rounded', use: 'Código inline, small inputs' },
  { label: 'rounded-lg (8px)', class: 'rounded-lg', use: 'Botones, badges, chips small' },
  { label: 'rounded-xl (12px)', class: 'rounded-xl', use: 'Cards, ExampleFrame, tabla-card' },
  { label: 'rounded-2xl (16px)', class: 'rounded-2xl', use: 'Dialogs, drawers' },
  { label: 'rounded-full (9999)', class: 'rounded-full', use: 'Avatars, pills, dots' },
];
</script>

<template>
  <div class="flex flex-col gap-10">
    <!-- Page header -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-widest mb-1" style="color: var(--fg-subtle);">
          Foundations / Tokens
        </p>
        <h1 class="text-2xl font-semibold m-0" style="color: var(--fg-default);">Design tokens</h1>
        <p class="text-sm mt-1 m-0" style="color: var(--fg-muted);">
          Variables CSS de <code class="font-mono text-xs px-1 rounded" style="background: var(--surface-sunken);">assets/main.css</code>.
          Usar siempre <code class="font-mono text-xs px-1 rounded" style="background: var(--surface-sunken);">var(--token)</code> en lugar de hex sueltos o clases Tailwind de color.
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 flex items-center gap-2 text-xs px-3 py-2 rounded-lg transition-colors"
        style="border: 1px solid var(--surface-border); background: var(--surface-sunken); color: var(--fg-default); cursor: pointer;"
        @click="toggleDark"
      >
        <i :class="localDark ? 'pi pi-sun' : 'pi pi-moon'" />
        {{ localDark ? 'Modo claro' : 'Modo oscuro' }}
      </button>
    </div>

    <!-- Brand colors -->
    <ExampleFrame title="Marca (brand)" description="Paleta corporativa Alega. Usar en gradientes, iconos de marca, eyebrows.">
      <div class="flex flex-wrap gap-4">
        <div
          v-for="t in brandTokens"
          :key="t.name"
          class="flex flex-col items-center gap-2"
        >
          <div
            class="w-16 h-16 rounded-xl border"
            :style="{ background: t.hex, borderColor: 'var(--surface-border)' }"
          />
          <div class="flex flex-col items-center gap-0.5 text-center">
            <span class="text-xs font-semibold" style="color: var(--fg-default);">{{ t.label }}</span>
            <code class="text-[10px] font-mono" style="color: var(--fg-subtle);">{{ t.name }}</code>
            <code class="text-[10px] font-mono" style="color: var(--fg-subtle);">{{ t.hex }}</code>
          </div>
        </div>
      </div>
    </ExampleFrame>

    <!-- Surfaces -->
    <ExampleFrame title="Surfaces" description="Jerarquía de planos. App es el fondo global; Raised son las tarjetas; Sunken es el interior de inputs y headers.">
      <div class="flex flex-col gap-3">
        <div
          v-for="s in surfaceTokens"
          :key="s.name"
          class="flex items-center gap-4 rounded-lg p-3"
          :style="{ background: `var(${s.name})`, border: '1px solid var(--surface-border-strong)' }"
        >
          <code class="text-xs font-mono shrink-0 w-44" style="color: var(--fg-muted);">{{ s.name }}</code>
          <span class="text-sm" style="color: var(--fg-default);">{{ s.label }}</span>
        </div>
      </div>
    </ExampleFrame>

    <!-- Foreground -->
    <ExampleFrame title="Foreground (texto)" description="Escala semántica para texto. Siempre var(--fg-*) — nunca hex ni text-gray-*.">
      <div class="flex flex-col gap-3" style="background: var(--surface-raised); padding: 1rem; border-radius: 8px;">
        <div
          v-for="fg in fgTokens"
          :key="fg.name"
          class="flex items-center gap-4"
        >
          <code class="text-xs font-mono shrink-0 w-36" style="color: var(--fg-subtle);">{{ fg.name }}</code>
          <span class="text-sm font-medium shrink-0 w-20" :style="{ color: `var(${fg.name})` }">{{ fg.label }}</span>
          <span class="text-sm" :style="{ color: `var(${fg.name})` }">{{ fg.sample }}</span>
        </div>
      </div>
    </ExampleFrame>

    <!-- Accent -->
    <ExampleFrame title="Accent (interactivo)" description="--accent es el color primario de botones, links y focus. Light: Zafiro #2D3FBF · Dark: #949df8.">
      <div class="flex flex-wrap gap-4">
        <div
          v-for="a in accentTokens"
          :key="a.name"
          class="flex flex-col gap-2 min-w-[130px]"
        >
          <div
            class="h-12 rounded-lg border"
            :style="{ background: `var(${a.name})`, borderColor: 'var(--surface-border)' }"
          />
          <div class="flex flex-col gap-0.5">
            <code class="text-[10px] font-mono" style="color: var(--fg-default);">{{ a.name }}</code>
            <span class="text-[11px]" style="color: var(--fg-subtle);">{{ a.label }}</span>
          </div>
        </div>
      </div>
    </ExampleFrame>

    <!-- Shadows -->
    <ExampleFrame title="Sombras" description="Tres niveles de elevación. Shadow-lg para dialogs y popovers; sm para separación interna.">
      <div class="flex flex-wrap gap-6 p-4" style="background: var(--surface-sunken); border-radius: 8px;">
        <div
          v-for="sh in shadowTokens"
          :key="sh.name"
          class="flex flex-col gap-2"
        >
          <div
            class="w-32 h-12 rounded-xl"
            :style="{ background: 'var(--surface-raised)', boxShadow: `var(${sh.name})`, border: '1px solid var(--surface-border)' }"
          />
          <div class="flex flex-col gap-0.5">
            <code class="text-[10px] font-mono" style="color: var(--fg-default);">{{ sh.name }}</code>
            <span class="text-[11px] leading-snug" style="color: var(--fg-subtle);">{{ sh.label }}</span>
          </div>
        </div>
      </div>
    </ExampleFrame>

    <!-- Status colors -->
    <ExampleFrame title="Colores de estado (no son tokens CSS)" description="Usados vía clases Tailwind o hex. Emerald para éxito, amber para advertencia/dirty, red para error.">
      <div class="flex flex-wrap gap-4">
        <div
          v-for="sc in statusColors"
          :key="sc.name"
          class="flex items-center gap-3 rounded-lg p-3"
          style="border: 1px solid var(--surface-border); background: var(--surface-raised);"
        >
          <div
            class="w-8 h-8 rounded-full shrink-0"
            :style="{ background: sc.hex }"
          />
          <div class="flex flex-col gap-0.5">
            <span class="text-xs font-semibold" style="color: var(--fg-default);">{{ sc.name }}</span>
            <code class="text-[10px] font-mono" style="color: var(--fg-subtle);">{{ sc.hex }} · {{ sc.label }}</code>
            <span class="text-[10px]" style="color: var(--fg-subtle);">{{ sc.use }}</span>
          </div>
        </div>
      </div>
    </ExampleFrame>

    <!-- Radius scale -->
    <ExampleFrame title="Radio de bordes (radius scale)" description="Tailwind built-in. No existen tokens CSS para radio — usar las clases directamente.">
      <div class="flex flex-wrap gap-4 items-end">
        <div
          v-for="r in radiusScale"
          :key="r.label"
          class="flex flex-col items-center gap-2"
        >
          <div
            class="w-16 h-16"
            :class="r.class"
            style="background: var(--accent-soft); border: 2px solid var(--accent);"
          />
          <div class="flex flex-col items-center gap-0.5 text-center">
            <code class="text-[10px] font-mono" style="color: var(--fg-default);">{{ r.class }}</code>
            <span class="text-[10px]" style="color: var(--fg-subtle);">{{ r.use }}</span>
          </div>
        </div>
      </div>
    </ExampleFrame>

    <!-- Spacing note -->
    <ExampleFrame title="Escala de espaciado" description="Tailwind spacing. Los gaps preferidos en Alega son: 0.5 / 0.75 / 1 / 1.25 / 1.5rem. Padding de secciones: 1.25-1.5rem. Gap entre campos: 0.75-1rem.">
      <div class="flex items-end gap-2 flex-wrap">
        <div
          v-for="size in [2, 3, 4, 5, 6, 8, 10, 12]"
          :key="size"
          class="flex flex-col items-center gap-1"
        >
          <div
            class="bg-[var(--accent-soft)] border border-[var(--accent)]"
            :style="{ width: `${size * 4}px`, height: '32px', borderRadius: '4px' }"
          />
          <code class="text-[10px] font-mono" style="color: var(--fg-subtle);">{{ size * 4 }}px</code>
        </div>
      </div>
    </ExampleFrame>

    <!-- Rules -->
    <div class="flex flex-col gap-3">
      <h2 class="text-base font-semibold m-0" style="color: var(--fg-default);">Reglas inviolables</h2>
      <div class="rounded-xl overflow-hidden" style="border: 1px solid var(--surface-border);">
        <table class="w-full text-xs">
          <thead>
            <tr style="background: var(--surface-sunken); border-bottom: 1px solid var(--surface-border);">
              <th class="text-left px-4 py-2 font-semibold w-1/2" style="color: var(--fg-muted);">Regla</th>
              <th class="text-left px-4 py-2 font-semibold w-1/2" style="color: var(--fg-muted);">Detalle</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid var(--surface-border);">
              <td class="px-4 py-2.5 font-medium" style="color: var(--fg-default);">Nunca hex suelto en CSS</td>
              <td class="px-4 py-2.5" style="color: var(--fg-muted);">Usar <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">var(--token)</code>. Excepción: colores de estado sin token CSS (#10b981, #dc2626).</td>
            </tr>
            <tr style="border-bottom: 1px solid var(--surface-border);">
              <td class="px-4 py-2.5 font-medium" style="color: var(--fg-default);">Nunca text-gray-* / text-blue-*</td>
              <td class="px-4 py-2.5" style="color: var(--fg-muted);">Usar <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">text-[var(--fg-muted)]</code> o equivalente.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-medium" style="color: var(--fg-default);">Dark mode automático</td>
              <td class="px-4 py-2.5" style="color: var(--fg-muted);">Los tokens se redefinenen <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">html.dark</code>. No necesitas media queries si usas los tokens.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer links -->
    <div class="flex flex-wrap gap-4 text-xs" style="color: var(--fg-muted);">
      <span>Definición: <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">apps/web/src/assets/main.css</code></span>
      <span>·</span>
      <span>Preset PrimeVue: <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">apps/web/src/theme/alegaPreset.ts</code></span>
      <span>·</span>
      <span>Skill: <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">.agents/skills/alega-ui-context/SKILL.md</code></span>
    </div>
  </div>
</template>
