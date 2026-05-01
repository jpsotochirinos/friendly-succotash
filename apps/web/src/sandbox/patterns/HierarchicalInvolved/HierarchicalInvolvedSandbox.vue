<script setup lang="ts">
import { ref } from 'vue';
import Popover from 'primevue/popover';
import ExampleFrame from '../../_shared/ExampleFrame.vue';

interface Involucrado {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: string;
}

const emptyList: Involucrado[] = [];

const soloPrimary: Involucrado[] = [
  { id: '1', name: 'Carlos Mendoza', initials: 'CM', color: '#3b5bdb', role: 'Responsable' },
];

const team: Involucrado[] = [
  { id: '1', name: 'Carlos Mendoza', initials: 'CM', color: '#3b5bdb', role: 'Responsable' },
  { id: '2', name: 'Sofia Vega', initials: 'SV', color: '#862e9c', role: 'Colaborador' },
  { id: '3', name: 'Ana Torres', initials: 'AT', color: '#0ca678', role: 'Revisor' },
];

const popoverRef = ref<InstanceType<typeof Popover> | null>(null);
const activeInvolucrados = ref<Involucrado[]>([]);

function openInvolucradosPopover(e: MouseEvent, list: Involucrado[]) {
  activeInvolucrados.value = list;
  popoverRef.value?.toggle(e);
}

const codeSnippet = `<!-- Involved stack: primary + collab row + copy + popover -->
<div class="wb-involved">
  <div class="wb-inv-stack">
    <span class="wb-avatar-primary" :style="{ background: primary.color }">
      {{ primary.initials }}
    </span>
    <div v-if="rest.length" class="wb-collab-row">
      <span
        v-for="(inv, idx) in rest"
        :key="inv.id"
        class="wb-avatar-collab--h"
        :style="{ background: inv.color, zIndex: 3 - idx }"
      >{{ inv.initials }}</span>
    </div>
  </div>
  <div class="wb-involved__copy">…</div>
</div>`;
</script>

<template>
  <div class="hi-page flex flex-col gap-10 p-4 md:p-6 max-w-3xl mx-auto">
    <div>
      <p class="text-xs font-semibold uppercase tracking-widest mb-1" style="color: var(--fg-subtle);">Patrones / Involved stack</p>
      <h1 class="text-2xl font-semibold m-0" style="color: var(--fg-default);">Avatares jerárquicos (involucrados)</h1>
      <p class="text-sm mt-1 m-0" style="color: var(--fg-muted);">
        Responsable dominante + colaboradores en fila compacta; desglose en Popover. Origen canónico:
        <code class="text-xs">ExpedienteV21Sandbox.vue</code> columna Involucrados.
      </p>
    </div>

    <ExampleFrame
      title="Sin asignar"
      description="Estado vacío: avatar punteado + copy en itálica."
      :code="codeSnippet"
    >
      <div
        class="rounded-xl p-6"
        style="border: 1px solid var(--surface-border); background: var(--surface-raised);"
      >
        <div class="wb-involved">
          <template v-if="emptyList.length === 0">
            <span
              class="wb-avatar-primary wb-avatar-primary--empty"
              aria-label="Sin asignar"
              v-tooltip.top="'Sin asignar'"
            >
              <i class="pi pi-user-plus" aria-hidden="true" />
            </span>
            <span class="wb-involved__copy">
              <span class="wb-involved__name wb-involved__name--empty">Sin asignar</span>
              <span class="wb-involved__role">Responsable</span>
            </span>
          </template>
        </div>
      </div>
    </ExampleFrame>

    <ExampleFrame
      title="Solo responsable"
      description="Un solo avatar grande con anillo de acento; sin fila de colaboradores."
      :code="codeSnippet"
    >
      <div
        class="rounded-xl p-6"
        style="border: 1px solid var(--surface-border); background: var(--surface-raised);"
      >
        <div class="wb-involved">
          <div class="wb-inv-stack">
            <span
              class="wb-avatar-primary"
              :style="{ background: soloPrimary[0]!.color }"
              :aria-label="`${soloPrimary[0]!.name} – Responsable`"
              v-tooltip.right="`${soloPrimary[0]!.name} · Responsable`"
            >
              {{ soloPrimary[0]!.initials }}
            </span>
          </div>
          <div class="wb-involved__copy">
            <span class="wb-involved__name">{{ soloPrimary[0]!.name }}</span>
            <span class="wb-involved__role">Responsable</span>
          </div>
        </div>
      </div>
    </ExampleFrame>

    <ExampleFrame
      title="Responsable + colaboradores"
      description="Fila horizontal solapada bajo el primario; «+N involucrados» abre lista en Popover."
      :code="codeSnippet"
    >
      <div
        class="rounded-xl p-6"
        style="border: 1px solid var(--surface-border); background: var(--surface-raised);"
      >
        <div class="wb-involved">
          <div class="wb-inv-stack">
            <span
              class="wb-avatar-primary"
              :style="{ background: team[0]!.color }"
              :aria-label="`${team[0]!.name} – Responsable`"
              v-tooltip.right="`${team[0]!.name} · Responsable`"
            >
              {{ team[0]!.initials }}
            </span>
            <div class="wb-collab-row">
              <span
                v-for="(inv, idx) in team.slice(1)"
                :key="inv.id"
                class="wb-avatar-collab--h"
                :style="{ background: inv.color, zIndex: 3 - idx }"
                :aria-label="`${inv.name} – ${inv.role}`"
                v-tooltip.right="`${inv.name} · ${inv.role}`"
              >
                {{ inv.initials }}
              </span>
            </div>
          </div>
          <div class="wb-involved__copy">
            <span class="wb-involved__name">{{ team[0]!.name }}</span>
            <span class="wb-involved__role">Responsable</span>
            <button
              type="button"
              class="wb-involved__more-link"
              @click="(e) => openInvolucradosPopover(e, team)"
            >
              +{{ team.length - 1 }} involucrado{{ team.length - 1 > 1 ? 's' : '' }}
            </button>
          </div>
        </div>
      </div>
    </ExampleFrame>

    <Popover ref="popoverRef" class="wb-inv-pop">
      <div class="wb-inv-pop__header">
        <p>Involucrados</p>
      </div>
      <ul class="wb-inv-pop__list">
        <li
          v-for="(inv, idx) in activeInvolucrados"
          :key="inv.id"
          class="wb-inv-pop__item"
        >
          <span
            class="wb-inv-pop__avatar"
            :class="{ 'wb-inv-pop__avatar--primary': idx === 0 }"
            :style="{ background: inv.color }"
            aria-hidden="true"
          >{{ inv.initials }}</span>
          <span class="wb-inv-pop__copy">
            <strong>{{ inv.name }}</strong>
            <small>{{ inv.role }}</small>
          </span>
          <span v-if="idx === 0" class="wb-inv-pop__badge">Responsable</span>
        </li>
      </ul>
    </Popover>
  </div>
</template>

<style scoped>
/* ── Involved cell (aligned with ExpedienteV21Sandbox) ──────────────────── */
.wb-involved {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
}

.wb-inv-stack {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  width: 2.15rem;
}

.wb-avatar-primary {
  display: inline-grid;
  width: 2.15rem;
  height: 2.15rem;
  flex-shrink: 0;
  place-items: center;
  border-radius: 999px;
  box-shadow:
    0 0 0 2px var(--surface-raised),
    0 0 0 3.5px color-mix(in srgb, var(--accent) 40%, var(--surface-border));
  color: var(--fg-on-brand);
  font-size: 0.7rem;
  font-weight: 760;
  position: relative;
  z-index: 4;
  cursor: default;
}

.wb-avatar-primary--empty {
  background: var(--surface-sunken);
  border: 1.5px dashed var(--surface-border);
  box-shadow: none;
  color: var(--fg-subtle);
  font-size: 0.82rem;
}

.wb-collab-row {
  display: flex;
  flex-direction: row;
  justify-content: center;
  margin-top: -0.18rem;
}

.wb-avatar-collab--h {
  display: inline-grid;
  width: 1.4rem;
  height: 1.4rem;
  place-items: center;
  border-radius: 999px;
  border: 2px solid var(--surface-raised);
  color: var(--fg-on-brand);
  font-size: 0.5rem;
  font-weight: 760;
  margin-left: -0.35rem;
  opacity: 0.9;
  position: relative;
  z-index: 2;
  cursor: default;
}

.wb-collab-row .wb-avatar-collab--h:first-child {
  margin-left: 0;
}

.wb-involved__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 0.06rem;
}

.wb-involved__name {
  overflow: hidden;
  color: var(--fg-default);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wb-involved__name--empty {
  color: var(--fg-subtle);
  font-style: italic;
  font-weight: 400;
}

.wb-involved__role {
  color: var(--accent);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.wb-involved__more-link {
  align-self: flex-start;
  border: none;
  background: none;
  color: var(--fg-subtle);
  cursor: pointer;
  font: inherit;
  font-size: 0.65rem;
  padding: 0;
  transition: color 0.12s ease;
}

.wb-involved__more-link:hover {
  color: var(--accent);
  text-decoration: underline;
}

.wb-involved__more-link:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent) 44%, var(--surface-border));
  outline-offset: 2px;
}

:deep(.wb-inv-pop) {
  width: min(100vw - 2rem, 15rem);
}

.wb-inv-pop__header {
  border-bottom: 1px solid var(--surface-border);
  padding: 0.55rem 0.75rem 0.45rem;
}

.wb-inv-pop__header p {
  margin: 0;
  color: var(--fg-muted);
  font-size: 0.67rem;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.wb-inv-pop__list {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0;
  padding: 0.35rem;
  list-style: none;
}

.wb-inv-pop__item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border-radius: 0.55rem;
  padding: 0.5rem 0.55rem;
}

.wb-inv-pop__item:first-child {
  background: color-mix(in srgb, var(--accent-soft) 55%, transparent);
}

.wb-inv-pop__avatar {
  display: inline-grid;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  place-items: center;
  border-radius: 999px;
  color: var(--fg-on-brand);
  font-size: 0.65rem;
  font-weight: 760;
}

.wb-inv-pop__avatar--primary {
  box-shadow:
    0 0 0 2px var(--surface-raised),
    0 0 0 3.5px color-mix(in srgb, var(--accent) 40%, var(--surface-border));
}

.wb-inv-pop__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 0.08rem;
}

.wb-inv-pop__copy strong {
  overflow: hidden;
  color: var(--fg-default);
  font-size: 0.82rem;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wb-inv-pop__copy small {
  color: var(--fg-subtle);
  font-size: 0.7rem;
}

.wb-inv-pop__badge {
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 0.58rem;
  font-weight: 750;
  letter-spacing: 0.04em;
  padding: 0.12rem 0.4rem;
  text-transform: uppercase;
}
</style>
