<script setup lang="ts">
import { ref } from 'vue';
import Slider from 'primevue/slider';
import ColorPicker from 'primevue/colorpicker';
import ExampleFrame from '../../_shared/ExampleFrame.vue';

const days = ref(30);
const range = ref<[number, number]>([20000, 80000]);
const stepValue = ref(3);
const chipAccent = ref('2d3fbf');

const codeSlider = `<!-- Slider simple (días) -->
<Slider v-model="days" :min="0" :max="365" />
<span>{{ days }} días</span>

<!-- Range slider (monto) -->
<Slider v-model="range" :min="0" :max="500000" range />
<span>S/. {{ range[0].toLocaleString() }} – S/. {{ range[1].toLocaleString() }}</span>`;
</script>

<template>
  <div class="flex flex-col gap-10">
    <div>
      <p class="text-xs font-semibold uppercase tracking-widest mb-1" style="color: var(--fg-subtle);">Componentes / Slider</p>
      <h1 class="text-2xl font-semibold m-0" style="color: var(--fg-default);">Slider, ColorPicker</h1>
      <p class="text-sm mt-1 m-0" style="color: var(--fg-muted);">Slider para valores numéricos continuos (días de plazo, rangos de monto). ColorPicker para personalización de tipos de expediente con --chip-accent.</p>
    </div>

    <!-- Slider simple -->
    <ExampleFrame title="Slider — días de plazo" :code="codeSlider">
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <label class="text-[0.8125rem] font-medium" style="color: var(--fg-default);">Vencimiento en los próximos</label>
          <span class="text-sm font-semibold" style="color: var(--accent);">{{ days }} días</span>
        </div>
        <Slider v-model="days" :min="0" :max="365" />
        <div class="flex justify-between text-xs" style="color: var(--fg-subtle);">
          <span>Hoy</span>
          <span>30 días</span>
          <span>90 días</span>
          <span>1 año</span>
        </div>
      </div>
    </ExampleFrame>

    <!-- Slider range -->
    <ExampleFrame title="Slider range — rango de honorarios">
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <label class="text-[0.8125rem] font-medium" style="color: var(--fg-default);">Rango de honorarios</label>
          <span class="text-sm font-semibold" style="color: var(--accent);">
            S/. {{ range[0].toLocaleString('es-PE') }} – S/. {{ range[1].toLocaleString('es-PE') }}
          </span>
        </div>
        <Slider v-model="range" :min="0" :max="500000" :step="5000" range />
      </div>
    </ExampleFrame>

    <!-- Slider con step y marcadores -->
    <ExampleFrame title="Slider con step — prioridad">
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <label class="text-[0.8125rem] font-medium" style="color: var(--fg-default);">Nivel de prioridad</label>
          <span class="text-sm font-semibold" style="color: var(--accent);">{{ ['Baja', 'Media-baja', 'Media', 'Media-alta', 'Alta'][stepValue] ?? stepValue }}</span>
        </div>
        <Slider v-model="stepValue" :min="0" :max="4" :step="1" />
        <div class="flex justify-between text-xs" style="color: var(--fg-subtle);">
          <span>Baja</span>
          <span>Media</span>
          <span>Alta</span>
        </div>
      </div>
    </ExampleFrame>

    <!-- ColorPicker -->
    <ExampleFrame title="ColorPicker — color de tipo de expediente (--chip-accent)" description="Para personalizar el color de acento de un tipo. El valor se aplica como --chip-accent en el type-chip.">
      <div class="flex flex-col gap-4">
        <div class="flex items-start gap-4">
          <div class="flex flex-col gap-2">
            <label class="text-[0.8125rem] font-medium" style="color: var(--fg-default);">Color del tipo</label>
            <ColorPicker v-model="chipAccent" />
          </div>
          <div class="flex flex-col gap-2">
            <span class="text-[0.8125rem] font-medium" style="color: var(--fg-default);">Preview: type-chip</span>
            <button
              class="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold border-[1.5px] transition-colors"
              :style="{
                '--chip-accent': `#${chipAccent}`,
                borderColor: `#${chipAccent}`,
                background: `color-mix(in srgb, #${chipAccent} 12%, var(--surface-raised))`,
                color: `#${chipAccent}`,
              }"
            >
              <span class="w-1.5 h-1.5 rounded-full" :style="{ background: `#${chipAccent}` }" />
              Personalizado
            </button>
          </div>
        </div>
        <code class="text-xs font-mono" style="color: var(--fg-subtle);">--chip-accent: #{{ chipAccent }}</code>
      </div>
    </ExampleFrame>

    <div class="flex flex-wrap gap-4 text-xs" style="color: var(--fg-muted);">
      <a href="https://primevue.org/slider/" target="_blank" rel="noopener" class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors" style="color: var(--fg-muted);"><i class="pi pi-external-link text-[10px]" /> Slider</a>
      <span>·</span>
      <a href="https://primevue.org/colorpicker/" target="_blank" rel="noopener" class="flex items-center gap-1 no-underline hover:text-[var(--accent)] transition-colors" style="color: var(--fg-muted);"><i class="pi pi-external-link text-[10px]" /> ColorPicker</a>
    </div>
  </div>
</template>
