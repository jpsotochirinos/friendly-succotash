<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import Calendar from 'primevue/calendar';
import { useToast } from 'primevue/usetoast';
import ExampleFrame from '../../_shared/ExampleFrame.vue';

const toast = useToast();

// =====================================================================
// SIMPLE FORM DIALOG — Nueva parte (sin stepper)
// =====================================================================
const showSimple = ref(false);
const simpleLoading = ref(false);
const simpleSnapshot = ref('');

const partyForm = ref({
  role: 'representada' as 'representada' | 'contraparte' | 'tercero',
  name: '',
  documentType: 'DNI' as 'DNI' | 'RUC' | 'CE' | 'PASS',
  documentNumber: '',
  email: '',
});

const partyErrors = ref({ name: '', documentNumber: '' });

const partyRoleOptions = [
  { label: 'Representada', value: 'representada' },
  { label: 'Contraparte', value: 'contraparte' },
  { label: 'Tercero', value: 'tercero' },
];

const partyDocOptions = [
  { label: 'DNI', value: 'DNI' },
  { label: 'RUC', value: 'RUC' },
  { label: 'C.E.', value: 'CE' },
  { label: 'Pasaporte', value: 'PASS' },
];

const partyIsDirty = computed(() => JSON.stringify(partyForm.value) !== simpleSnapshot.value);

function resetPartyForm() {
  partyForm.value = {
    role: 'representada',
    name: '',
    documentType: 'DNI',
    documentNumber: '',
    email: '',
  };
  partyErrors.value = { name: '', documentNumber: '' };
  simpleSnapshot.value = JSON.stringify(partyForm.value);
}

function openSimple() {
  resetPartyForm();
  showSimple.value = true;
}

function attemptCloseSimple() {
  if (simpleLoading.value) return;
  if (partyIsDirty.value && !window.confirm('¿Descartar los cambios?')) return;
  showSimple.value = false;
}

const partyCanSubmit = computed(
  () => partyForm.value.name.trim().length > 0 && partyForm.value.documentNumber.trim().length > 0,
);

async function submitParty() {
  partyErrors.value.name = partyForm.value.name.trim() ? '' : 'El nombre es obligatorio';
  partyErrors.value.documentNumber = partyForm.value.documentNumber.trim()
    ? ''
    : 'El documento es obligatorio';
  if (partyErrors.value.name || partyErrors.value.documentNumber) return;

  simpleLoading.value = true;
  try {
    await new Promise((resolve) => setTimeout(resolve, 800));
    showSimple.value = false;
    toast.add({
      severity: 'success',
      summary: 'Parte agregada',
      detail: partyForm.value.name,
      life: 3000,
    });
  } finally {
    simpleLoading.value = false;
  }
}

// =====================================================================
// WIZARD FORM DIALOG — Nuevo expediente (3 pasos)
// =====================================================================
const showWizard = ref(false);
const wizardStep = ref(0);
const wizardLoading = ref(false);
const stepDirection = ref<'forward' | 'backward'>('forward');
const stepTransitionName = computed(() =>
  stepDirection.value === 'forward' ? 'step-fwd' : 'step-back',
);

const wizardSteps = [{ label: 'Identidad' }, { label: 'Partes' }, { label: 'Opciones' }];

const wizardForm = ref({
  emoji: '⚖️',
  title: '',
  type: 'caso' as 'caso' | 'proceso' | 'proyecto' | 'auditoria',
  matterType: 'litigio' as 'litigio' | 'corporativo' | 'familia' | 'laboral',
  clientName: '',
  assigneeName: '',
  deadlineDate: null as Date | null,
});

const wizardErrors = ref({ title: '' });

const emojiOptions = ['⚖️', '🏢', '👨‍👩‍👧', '🏗️', '⚠️', '🏛️', '📁', '📋'];

const wizardTypeOptions = [
  { label: 'Caso', value: 'caso' },
  { label: 'Proceso', value: 'proceso' },
  { label: 'Proyecto', value: 'proyecto' },
  { label: 'Auditoría', value: 'auditoria' },
];

const wizardMatterOptions = [
  { label: 'Litigio', value: 'litigio' },
  { label: 'Corporativo', value: 'corporativo' },
  { label: 'Familia', value: 'familia' },
  { label: 'Laboral', value: 'laboral' },
];

function resetWizard() {
  wizardStep.value = 0;
  stepDirection.value = 'forward';
  wizardForm.value = {
    emoji: '⚖️',
    title: '',
    type: 'caso',
    matterType: 'litigio',
    clientName: '',
    assigneeName: '',
    deadlineDate: null,
  };
  wizardErrors.value = { title: '' };
}

function openWizard() {
  resetWizard();
  showWizard.value = true;
}

function canAdvanceWizard() {
  if (wizardStep.value === 0) {
    wizardErrors.value.title = wizardForm.value.title.trim() ? '' : 'El título es obligatorio';
    return !wizardErrors.value.title;
  }
  return true;
}

function nextWizardStep() {
  if (!canAdvanceWizard()) return;
  stepDirection.value = 'forward';
  wizardStep.value++;
}

function prevWizardStep() {
  if (wizardStep.value > 0) {
    stepDirection.value = 'backward';
    wizardStep.value--;
  }
}

async function submitWizard() {
  if (!canAdvanceWizard()) return;
  wizardLoading.value = true;
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    showWizard.value = false;
    toast.add({
      severity: 'success',
      summary: 'Expediente creado',
      detail: wizardForm.value.title,
      life: 3000,
    });
  } finally {
    wizardLoading.value = false;
  }
}

// =====================================================================
// Code snippets for ExampleFrame
// =====================================================================
const codeSimple = `<Dialog
  v-model:visible="open"
  :modal="true"
  :draggable="false"
  :dismissable-mask="!loading && !isDirty"
  :closable="false"
  :close-on-escape="!loading"
  :style="{ width: 'min(520px, 96vw)' }"
  :pt="{
    mask: { class: 'alega-confirm-mask' },
    root: { class: 'matter-dialog-root !border-0 !bg-transparent !p-0 !m-0 !shadow-none overflow-visible' },
  }"
>
  <template #container>
    <div class="matter-dialog-shell">
      <header class="matter-dialog-header">
        <div class="flex items-start gap-3">
          <div class="matter-dialog-icon">
            <i class="pi pi-user text-xl" />
          </div>
          <div class="flex flex-col gap-0.5 min-w-0">
            <span class="matter-dialog-eyebrow">Nueva parte</span>
            <h2 class="matter-dialog-title">Agregar parte al expediente</h2>
            <p v-if="isDirty" class="matter-dialog-stephint">
              <span class="dirty-dot" /> Cambios sin guardar
            </p>
          </div>
        </div>
        <button class="dialog-close-btn" @click="attemptClose">
          <i class="pi pi-times" />
        </button>
      </header>

      <div class="matter-dialog-body">
        <section class="matter-form-section">
          <h3 class="matter-form-section__title">Identidad</h3>
          <!-- campos... -->
        </section>
      </div>

      <footer class="matter-dialog-footer">
        <Button label="Cancelar" text @click="attemptClose" />
        <Button label="Guardar" :loading="loading" :disabled="!canSubmit" @click="submit" />
      </footer>
    </div>
  </template>
</Dialog>`;

const codeWizard = `<Dialog ... :style="{ width: 'min(640px, 96vw)' }">
  <template #container>
    <div class="matter-dialog-shell">
      <header class="matter-dialog-header"> ... </header>

      <!-- Steps indicator -->
      <div class="matter-dialog-steps">
        <template v-for="(step, idx) in wizardSteps" :key="step.label">
          <div class="matter-dialog-step">
            <div class="matter-dialog-step__circle" :class="{ done: idx < current, active: idx === current }">
              <i v-if="idx < current" class="pi pi-check" />
              <span v-else>{{ idx + 1 }}</span>
            </div>
            <span class="matter-dialog-step__label">{{ step.label }}</span>
          </div>
          <div v-if="idx < wizardSteps.length - 1" class="matter-dialog-step__line" />
        </template>
      </div>

      <!-- Body with direction-aware transition -->
      <div class="matter-dialog-body">
        <Transition :name="stepTransitionName" mode="out-in">
          <section v-if="step === 0" key="step-0" class="matter-form-section">...</section>
          <section v-else-if="step === 1" key="step-1" class="matter-form-section">...</section>
          <section v-else key="step-2" class="matter-form-section">...</section>
        </Transition>
      </div>

      <footer class="matter-dialog-footer">
        <Button label="Cancelar" text @click="open = false" />
        <div class="flex gap-2">
          <Button v-if="step > 0" label="Atrás" outlined icon="pi pi-arrow-left" @click="prev" />
          <Button v-if="step < total - 1" label="Siguiente" icon="pi pi-arrow-right" icon-pos="right" @click="next" />
          <Button v-else label="Crear" icon="pi pi-check" :loading="loading" @click="submit" />
        </div>
      </footer>
    </div>
  </template>
</Dialog>`;
</script>

<template>
  <div class="flex flex-col gap-10">

    <!-- Page header -->
    <div>
      <p class="text-xs font-semibold uppercase tracking-widest mb-1" style="color: var(--fg-subtle);">
        Componentes / Dialog
      </p>
      <h1 class="text-2xl font-semibold m-0" style="color: var(--fg-default);">Dialog (form)</h1>
      <p class="text-sm mt-1 m-0" style="color: var(--fg-muted);">
        Diálogos de formulario en Alega usando PrimeVue
        <code class="font-mono text-xs px-1.5 py-0.5 rounded" style="background: var(--surface-sunken);">Dialog</code>
        con
        <code class="font-mono text-xs px-1.5 py-0.5 rounded" style="background: var(--surface-sunken);">#container</code>
        headless. Dos patrones: <strong>simple</strong> (un paso) y <strong>wizard</strong> (multi-paso con stepper).
      </p>
    </div>

    <!-- Rule banner -->
    <div
      class="flex gap-3 rounded-lg px-4 py-3 text-sm"
      style="border: 1px solid var(--surface-border); background: var(--accent-soft); color: var(--fg-default);"
    >
      <i class="pi pi-info-circle shrink-0 mt-0.5" style="color: var(--accent);" />
      <p class="m-0">
        Si el form solo tiene confirmación + acción (ej. archivar), usa
        <strong>ConfirmDialogBase</strong> en su lugar — ver
        <code class="font-mono text-xs px-1 rounded" style="background: var(--surface-raised);">/sandbox/components/confirm-dialog</code>.
        Estos diálogos son para <strong>capturar datos</strong>.
      </p>
    </div>

    <!-- ================================================================ -->
    <!-- SECTION 1: Simple form dialog (sin stepper)                      -->
    <!-- ================================================================ -->
    <section class="flex flex-col gap-6">
      <div class="flex flex-col gap-1">
        <h2 class="text-base font-semibold m-0" style="color: var(--fg-default);">
          Form dialog (sin stepper)
          <span class="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            estable
          </span>
        </h2>
        <p class="text-xs m-0" style="color: var(--fg-muted);">
          1 columna, &lt; 8 campos. Width <code class="font-mono text-xs px-1 rounded" style="background: var(--surface-sunken);">min(520px, 96vw)</code>.
          Header con eyebrow + título + dirty hint. Botón Guardar deshabilitado mientras no haya cambios.
        </p>
      </div>

      <ExampleFrame
        title="Nueva parte"
        description="Form simple de 5 campos. Demuestra: header degradado, dirty hint, validación inline, loading."
        :code="codeSimple"
      >
        <Button label="Demo: Nueva parte" icon="pi pi-user-plus" @click="openSimple" />
      </ExampleFrame>

      <!-- Rules table -->
      <div class="flex flex-col gap-3">
        <h3 class="text-sm font-semibold m-0" style="color: var(--fg-default);">Reglas inviolables</h3>
        <div class="rounded-xl overflow-hidden" style="border: 1px solid var(--surface-border);">
          <table class="w-full text-xs">
            <thead>
              <tr style="background: var(--surface-sunken); border-bottom: 1px solid var(--surface-border);">
                <th class="text-left px-4 py-2 font-semibold w-1/3" style="color: var(--fg-muted);">Regla</th>
                <th class="text-left px-4 py-2 font-semibold w-2/3" style="color: var(--fg-muted);">Detalle</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid var(--surface-border);">
                <td class="px-4 py-2.5 font-medium" style="color: var(--fg-default);">Headless container</td>
                <td class="px-4 py-2.5" style="color: var(--fg-muted);">
                  Usar <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">&lt;template #container&gt;</code> para evitar el padding del preset Aura en <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">.p-dialog-content</code>.
                </td>
              </tr>
              <tr style="border-bottom: 1px solid var(--surface-border);">
                <td class="px-4 py-2.5 font-medium" style="color: var(--fg-default);">Header con eyebrow</td>
                <td class="px-4 py-2.5" style="color: var(--fg-muted);">
                  Eyebrow uppercase 11px en zafiro/accent + título 17px + step hint 13px. Sin <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">font-bold</code>.
                </td>
              </tr>
              <tr style="border-bottom: 1px solid var(--surface-border);">
                <td class="px-4 py-2.5 font-medium" style="color: var(--fg-default);">Header gradient</td>
                <td class="px-4 py-2.5" style="color: var(--fg-muted);">
                  Degradado vertical zafiro 7% → transparente (claro) / accent 18% → transparente (oscuro). Mismo patrón que <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">ConfirmDialogBase</code>.
                </td>
              </tr>
              <tr style="border-bottom: 1px solid var(--surface-border);">
                <td class="px-4 py-2.5 font-medium" style="color: var(--fg-default);">Dirty guard (edit)</td>
                <td class="px-4 py-2.5" style="color: var(--fg-muted);">
                  Snapshot del form al abrir. Botón Guardar deshabilitado si no hay cambios. Cierre por mask/X bloqueado o pide confirm si dirty.
                </td>
              </tr>
              <tr style="border-bottom: 1px solid var(--surface-border);">
                <td class="px-4 py-2.5 font-medium" style="color: var(--fg-default);">Loading state</td>
                <td class="px-4 py-2.5" style="color: var(--fg-muted);">
                  Botón primario con <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">:loading</code>. Mask y Esc bloqueados (<code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">!loading</code>).
                </td>
              </tr>
              <tr>
                <td class="px-4 py-2.5 font-medium" style="color: var(--fg-default);">i18n</td>
                <td class="px-4 py-2.5" style="color: var(--fg-muted);">
                  Toda label, placeholder, helper y error pasan por <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">t(...)</code>.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Divider -->
    <div style="border-top: 1px dashed var(--surface-border);" />

    <!-- ================================================================ -->
    <!-- SECTION 2: Wizard form dialog (con stepper)                      -->
    <!-- ================================================================ -->
    <section class="flex flex-col gap-6">
      <div class="flex flex-col gap-1">
        <h2 class="text-base font-semibold m-0" style="color: var(--fg-default);">
          Form dialog wizard (con stepper)
          <span class="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            estable
          </span>
        </h2>
        <p class="text-xs m-0" style="color: var(--fg-muted);">
          2-3 pasos. Width <code class="font-mono text-xs px-1 rounded" style="background: var(--surface-sunken);">min(640px, 96vw)</code>.
          Indicador horizontal con número/check + línea de progreso. Animaciones direccionales (forward/backward).
        </p>
      </div>

      <ExampleFrame
        title="Nuevo expediente (3 pasos)"
        description="Wizard con stepper horizontal. Demuestra: validación por paso, animación direccional, atrás/siguiente, submit final."
        :code="codeWizard"
      >
        <Button label="Demo: Nuevo expediente" icon="pi pi-plus" @click="openWizard" />
      </ExampleFrame>

      <!-- Animation table -->
      <div class="flex flex-col gap-3">
        <h3 class="text-sm font-semibold m-0" style="color: var(--fg-default);">Animaciones direccionales</h3>
        <div class="rounded-xl overflow-hidden" style="border: 1px solid var(--surface-border);">
          <table class="w-full text-xs">
            <thead>
              <tr style="background: var(--surface-sunken); border-bottom: 1px solid var(--surface-border);">
                <th class="text-left px-4 py-2 font-semibold" style="color: var(--fg-muted);">Acción</th>
                <th class="text-left px-4 py-2 font-semibold" style="color: var(--fg-muted);">Animación</th>
                <th class="text-left px-4 py-2 font-semibold" style="color: var(--fg-muted);">Clase</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid var(--surface-border);">
                <td class="px-4 py-2.5" style="color: var(--fg-default);">Siguiente</td>
                <td class="px-4 py-2.5" style="color: var(--fg-muted);">Sale a la izquierda · entra desde la derecha</td>
                <td class="px-4 py-2.5">
                  <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">step-fwd</code>
                </td>
              </tr>
              <tr style="border-bottom: 1px solid var(--surface-border);">
                <td class="px-4 py-2.5" style="color: var(--fg-default);">Atrás</td>
                <td class="px-4 py-2.5" style="color: var(--fg-muted);">Sale a la derecha · entra desde la izquierda</td>
                <td class="px-4 py-2.5">
                  <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">step-back</code>
                </td>
              </tr>
              <tr>
                <td class="px-4 py-2.5" style="color: var(--fg-default);">prefers-reduced-motion</td>
                <td class="px-4 py-2.5" style="color: var(--fg-muted);">Solo fade 120ms · sin translateX</td>
                <td class="px-4 py-2.5">
                  <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">@media</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Anti-patterns -->
    <div class="flex flex-col gap-3">
      <h3 class="text-sm font-semibold m-0" style="color: var(--fg-default);">Anti-patrones</h3>
      <div class="rounded-xl overflow-hidden" style="border: 1px solid var(--surface-border);">
        <table class="w-full text-xs">
          <thead>
            <tr style="background: var(--surface-sunken); border-bottom: 1px solid var(--surface-border);">
              <th class="text-left px-4 py-2 font-semibold w-1/2" style="color: var(--fg-muted);">Anti-patrón</th>
              <th class="text-left px-4 py-2 font-semibold w-1/2" style="color: var(--fg-muted);">Corrección</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid var(--surface-border);">
              <td class="px-4 py-2.5" style="color: var(--fg-default);">
                <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">header="Editar X"</code> de PrimeVue
              </td>
              <td class="px-4 py-2.5" style="color: var(--fg-muted);">
                Usar <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">#container</code> headless con header custom (eyebrow + título + hint).
              </td>
            </tr>
            <tr style="border-bottom: 1px solid var(--surface-border);">
              <td class="px-4 py-2.5" style="color: var(--fg-default);">Botón primario en el body</td>
              <td class="px-4 py-2.5" style="color: var(--fg-muted);">
                Siempre en footer propio del shell.
              </td>
            </tr>
            <tr style="border-bottom: 1px solid var(--surface-border);">
              <td class="px-4 py-2.5" style="color: var(--fg-default);">
                Mezclar form + confirmación en el mismo dialog
              </td>
              <td class="px-4 py-2.5" style="color: var(--fg-muted);">
                Form abre Confirm cuando la acción es destructiva.
              </td>
            </tr>
            <tr style="border-bottom: 1px solid var(--surface-border);">
              <td class="px-4 py-2.5" style="color: var(--fg-default);">Cerrar con dirty sin avisar</td>
              <td class="px-4 py-2.5" style="color: var(--fg-muted);">
                <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">window.confirm</code> de descarte o <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">ConfirmDialogBase</code>.
              </td>
            </tr>
            <tr style="border-bottom: 1px solid var(--surface-border);">
              <td class="px-4 py-2.5" style="color: var(--fg-default);">
                Wizard con &gt; 3 pasos
              </td>
              <td class="px-4 py-2.5" style="color: var(--fg-muted);">
                Promover a <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">alega-form-detail-dialog</code> con tabs.
              </td>
            </tr>
            <tr>
              <td class="px-4 py-2.5" style="color: var(--fg-default);">
                <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">font-bold</code> o <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">text-2xl</code> para títulos
              </td>
              <td class="px-4 py-2.5" style="color: var(--fg-muted);">
                <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">font-semibold</code> + <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">text-lg</code>.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Links -->
    <div class="flex flex-wrap gap-4 text-xs" style="color: var(--fg-muted);">
      <a
        href="https://primevue.org/dialog/"
        target="_blank"
        rel="noopener"
        class="flex items-center gap-1 hover:text-[var(--accent)] transition-colors no-underline"
        style="color: var(--fg-muted);"
      >
        <i class="pi pi-external-link text-[10px]" />
        Docs PrimeVue Dialog
      </a>
      <span>·</span>
      <span>
        Skill:
        <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">
          .agents/skills/alega-form-dialog/SKILL.md
        </code>
      </span>
      <span>·</span>
      <span>
        Hub:
        <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">
          .agents/skills/alega-primevue-components/SKILL.md
        </code>
      </span>
    </div>

    <!-- ================================================================ -->
    <!-- DIALOG INSTANCES                                                  -->
    <!-- ================================================================ -->

    <!-- Simple dialog -->
    <Dialog
      v-model:visible="showSimple"
      :modal="true"
      :draggable="false"
      :dismissable-mask="!simpleLoading && !partyIsDirty"
      :closable="false"
      :close-on-escape="!simpleLoading"
      :style="{ width: 'min(520px, 96vw)' }"
      :pt="{
        mask: { class: 'alega-confirm-mask' },
        root: { class: 'matter-dialog-root !border-0 !bg-transparent !p-0 !m-0 !shadow-none overflow-visible' },
      }"
    >
      <template #container>
        <div class="matter-dialog-shell">
          <header class="matter-dialog-header">
            <div class="flex items-start gap-3">
              <div class="matter-dialog-icon">
                <i class="pi pi-user text-xl" style="color: var(--brand-zafiro);" />
              </div>
              <div class="flex flex-col gap-0.5 min-w-0">
                <span class="matter-dialog-eyebrow">Nueva parte</span>
                <h2 class="matter-dialog-title">Agregar parte al expediente</h2>
                <p
                  v-if="partyIsDirty"
                  class="matter-dialog-stephint flex items-center gap-1.5"
                  style="color: #d97706;"
                >
                  <span class="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Cambios sin guardar
                </p>
                <p v-else class="matter-dialog-stephint">Identifícala para asignarle actuaciones después.</p>
              </div>
            </div>
            <button
              v-if="!simpleLoading"
              type="button"
              class="dialog-close-btn"
              aria-label="Cerrar"
              @click="attemptCloseSimple"
            >
              <i class="pi pi-times text-sm" />
            </button>
          </header>

          <div class="matter-dialog-body">
            <section class="matter-form-section">
              <h3 class="matter-form-section__title">Identidad</h3>

              <div class="grid sm:grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                  <label for="party-role" class="matter-field-label">Rol</label>
                  <Dropdown
                    id="party-role"
                    v-model="partyForm.role"
                    :options="partyRoleOptions"
                    option-label="label"
                    option-value="value"
                    :disabled="simpleLoading"
                    class="w-full"
                  />
                </div>

                <div class="flex flex-col gap-1">
                  <label for="party-doc-type" class="matter-field-label">Documento</label>
                  <Dropdown
                    id="party-doc-type"
                    v-model="partyForm.documentType"
                    :options="partyDocOptions"
                    option-label="label"
                    option-value="value"
                    :disabled="simpleLoading"
                    class="w-full"
                  />
                </div>
              </div>

              <div class="flex flex-col gap-1">
                <label for="party-name" class="matter-field-label">
                  Nombre completo / razón social <span class="matter-field-required">*</span>
                </label>
                <InputText
                  id="party-name"
                  v-model="partyForm.name"
                  placeholder="Ej. Juan Pérez Quispe / Constructora Andina S.A.C."
                  :invalid="!!partyErrors.name"
                  :disabled="simpleLoading"
                  autocomplete="off"
                  @input="partyErrors.name = ''"
                />
                <small v-if="partyErrors.name" class="matter-field-error">{{ partyErrors.name }}</small>
              </div>

              <div class="flex flex-col gap-1">
                <label for="party-doc-number" class="matter-field-label">
                  Nº de documento <span class="matter-field-required">*</span>
                </label>
                <InputText
                  id="party-doc-number"
                  v-model="partyForm.documentNumber"
                  placeholder="Ej. 12345678"
                  :invalid="!!partyErrors.documentNumber"
                  :disabled="simpleLoading"
                  autocomplete="off"
                  class="font-mono-num"
                  @input="partyErrors.documentNumber = ''"
                />
                <small v-if="partyErrors.documentNumber" class="matter-field-error">
                  {{ partyErrors.documentNumber }}
                </small>
              </div>

              <div class="flex flex-col gap-1">
                <label for="party-email" class="matter-field-label">Email (opcional)</label>
                <InputText
                  id="party-email"
                  v-model="partyForm.email"
                  type="email"
                  placeholder="parte@ejemplo.com"
                  :disabled="simpleLoading"
                  autocomplete="off"
                />
                <small class="matter-field-help">
                  Si se proporciona, podrás enviarle notificaciones desde el expediente.
                </small>
              </div>
            </section>
          </div>

          <footer class="matter-dialog-footer">
            <Button
              type="button"
              label="Cancelar"
              text
              :disabled="simpleLoading"
              @click="attemptCloseSimple"
            />
            <Button
              type="button"
              label="Guardar"
              icon="pi pi-check"
              :loading="simpleLoading"
              :disabled="!partyCanSubmit || simpleLoading"
              @click="submitParty"
            />
          </footer>
        </div>
      </template>
    </Dialog>

    <!-- Wizard dialog -->
    <Dialog
      v-model:visible="showWizard"
      :modal="true"
      :draggable="false"
      :dismissable-mask="!wizardLoading"
      :closable="false"
      :close-on-escape="!wizardLoading"
      :style="{ width: 'min(640px, 96vw)' }"
      :pt="{
        mask: { class: 'alega-confirm-mask' },
        root: { class: 'matter-dialog-root !border-0 !bg-transparent !p-0 !m-0 !shadow-none overflow-visible' },
      }"
    >
      <template #container>
        <div class="matter-dialog-shell">
          <header class="matter-dialog-header">
            <div class="flex items-start gap-3">
              <div class="matter-dialog-icon">
                <i class="pi pi-briefcase text-xl" style="color: var(--brand-zafiro);" />
              </div>
              <div class="flex flex-col gap-0.5 min-w-0">
                <span class="matter-dialog-eyebrow">Nuevo expediente · 3 pasos</span>
                <h2 class="matter-dialog-title">Nuevo expediente</h2>
                <p class="matter-dialog-stephint">{{ wizardSteps[wizardStep]?.label }}</p>
              </div>
            </div>
            <button
              v-if="!wizardLoading"
              type="button"
              class="dialog-close-btn"
              aria-label="Cerrar"
              @click="showWizard = false"
            >
              <i class="pi pi-times text-sm" />
            </button>
          </header>

          <!-- Steps indicator -->
          <div class="matter-dialog-steps">
            <template v-for="(step, idx) in wizardSteps" :key="step.label">
              <div class="flex items-center gap-2">
                <div
                  class="matter-dialog-step__circle"
                  :class="{
                    'matter-dialog-step__circle--done': idx < wizardStep,
                    'matter-dialog-step__circle--active': idx === wizardStep,
                  }"
                >
                  <i v-if="idx < wizardStep" class="pi pi-check text-[10px]" />
                  <span v-else>{{ idx + 1 }}</span>
                </div>
                <span
                  class="text-xs font-medium"
                  :style="
                    idx === wizardStep
                      ? { color: 'var(--fg-default)' }
                      : { color: 'var(--fg-subtle)' }
                  "
                >
                  {{ step.label }}
                </span>
              </div>
              <div
                v-if="idx < wizardSteps.length - 1"
                class="matter-dialog-step__line"
                :class="{ 'matter-dialog-step__line--done': idx < wizardStep }"
              />
            </template>
          </div>

          <!-- Body with direction-aware transition -->
          <div class="matter-dialog-body">
            <Transition :name="stepTransitionName" mode="out-in">

              <!-- Step 0: Identidad -->
              <section v-if="wizardStep === 0" key="w-step-0" class="matter-form-section">
                <h3 class="matter-form-section__title">Identidad</h3>

                <div class="flex flex-col gap-1">
                  <label class="matter-field-label">Emoji</label>
                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="emoji in emojiOptions"
                      :key="emoji"
                      type="button"
                      class="h-10 w-10 rounded-xl text-xl transition-all"
                      :style="
                        wizardForm.emoji === emoji
                          ? { background: 'var(--accent-soft)', border: '2px solid var(--accent)' }
                          : { background: 'var(--surface-sunken)', border: '2px solid transparent' }
                      "
                      @click="wizardForm.emoji = emoji"
                    >
                      {{ emoji }}
                    </button>
                  </div>
                </div>

                <div class="flex flex-col gap-1">
                  <label for="w-title" class="matter-field-label">
                    Título <span class="matter-field-required">*</span>
                  </label>
                  <InputText
                    id="w-title"
                    v-model="wizardForm.title"
                    placeholder="Ej. Pérez vs. Constructora Andina"
                    :invalid="!!wizardErrors.title"
                    :disabled="wizardLoading"
                    autocomplete="off"
                    @input="wizardErrors.title = ''"
                  />
                  <small v-if="wizardErrors.title" class="matter-field-error">{{ wizardErrors.title }}</small>
                </div>

                <div class="grid sm:grid-cols-2 gap-3">
                  <div class="flex flex-col gap-1">
                    <label for="w-type" class="matter-field-label">Tipo</label>
                    <Dropdown
                      id="w-type"
                      v-model="wizardForm.type"
                      :options="wizardTypeOptions"
                      option-label="label"
                      option-value="value"
                      :disabled="wizardLoading"
                      class="w-full"
                    />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label for="w-matter" class="matter-field-label">Materia</label>
                    <Dropdown
                      id="w-matter"
                      v-model="wizardForm.matterType"
                      :options="wizardMatterOptions"
                      option-label="label"
                      option-value="value"
                      :disabled="wizardLoading"
                      class="w-full"
                    />
                  </div>
                </div>
              </section>

              <!-- Step 1: Partes -->
              <section v-else-if="wizardStep === 1" key="w-step-1" class="matter-form-section">
                <h3 class="matter-form-section__title">Partes y responsable</h3>

                <div class="flex flex-col gap-1">
                  <label for="w-client" class="matter-field-label">Cliente representado</label>
                  <InputText
                    id="w-client"
                    v-model="wizardForm.clientName"
                    placeholder="Ej. Grupo Andino S.A.C."
                    :disabled="wizardLoading"
                    autocomplete="off"
                  />
                  <small class="matter-field-help">Opcional. Podrás vincular un cliente existente después.</small>
                </div>

                <div class="flex flex-col gap-1">
                  <label for="w-assignee" class="matter-field-label">Abogado a cargo</label>
                  <InputText
                    id="w-assignee"
                    v-model="wizardForm.assigneeName"
                    placeholder="Ej. Carlos Mendoza"
                    :disabled="wizardLoading"
                    autocomplete="off"
                  />
                </div>
              </section>

              <!-- Step 2: Opciones -->
              <section v-else key="w-step-2" class="matter-form-section">
                <h3 class="matter-form-section__title">Opciones adicionales</h3>

                <div class="flex flex-col gap-1">
                  <label for="w-deadline" class="matter-field-label">Fecha límite</label>
                  <Calendar
                    id="w-deadline"
                    v-model="wizardForm.deadlineDate"
                    show-icon
                    date-format="dd/mm/yy"
                    :disabled="wizardLoading"
                    class="w-full"
                  />
                  <small class="matter-field-help">Opcional. Las actuaciones tienen su propia fecha.</small>
                </div>
              </section>

            </Transition>
          </div>

          <footer class="matter-dialog-footer">
            <Button
              type="button"
              label="Cancelar"
              text
              :disabled="wizardLoading"
              @click="showWizard = false"
            />
            <div class="flex items-center gap-2">
              <Button
                v-if="wizardStep > 0"
                type="button"
                label="Atrás"
                severity="secondary"
                variant="outlined"
                icon="pi pi-arrow-left"
                :disabled="wizardLoading"
                @click="prevWizardStep"
              />
              <Button
                v-if="wizardStep < wizardSteps.length - 1"
                type="button"
                label="Siguiente"
                icon="pi pi-arrow-right"
                icon-pos="right"
                @click="nextWizardStep"
              />
              <Button
                v-else
                type="button"
                label="Crear expediente"
                icon="pi pi-check"
                :loading="wizardLoading"
                @click="submitWizard"
              />
            </div>
          </footer>
        </div>
      </template>
    </Dialog>

  </div>
</template>

<style scoped>
/* -----------------------------------------------------------------------
   Dialog shell (headless container pattern)
----------------------------------------------------------------------- */
:deep(.matter-dialog-root.p-dialog) {
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
  overflow: visible !important;
}

.matter-dialog-shell {
  width: 100%;
  max-height: min(88vh, 720px);
  border-radius: 16px;
  border: 1px solid var(--surface-border);
  background: var(--surface-raised);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* -----------------------------------------------------------------------
   Header (with brand gradient)
----------------------------------------------------------------------- */
.matter-dialog-header {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem 1rem;
  border-bottom: 1px solid var(--surface-border);
  flex-shrink: 0;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--brand-zafiro) 7%, transparent),
    transparent 90%
  );
}

html.dark .matter-dialog-header {
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--accent) 18%, transparent),
    transparent 90%
  );
}

.matter-dialog-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--brand-zafiro) 22%, var(--surface-border));
  background: color-mix(in srgb, var(--brand-zafiro) 8%, var(--surface-raised));
  flex-shrink: 0;
}

.matter-dialog-eyebrow {
  display: block;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--brand-zafiro);
}
html.dark .matter-dialog-eyebrow {
  color: var(--accent);
}

.matter-dialog-title {
  font-size: 1.0625rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--fg-default);
  margin: 0;
}

.matter-dialog-stephint {
  font-size: 0.8125rem;
  color: var(--fg-muted);
  margin: 0;
}

.dialog-close-btn {
  flex-shrink: 0;
  height: 2rem;
  width: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  color: var(--fg-muted);
  background: none;
  border: none;
  cursor: pointer;
  transition: background-color 120ms ease;
}
.dialog-close-btn:hover {
  background: var(--surface-sunken);
}

/* -----------------------------------------------------------------------
   Steps indicator
----------------------------------------------------------------------- */
.matter-dialog-steps {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border-bottom: 1px solid var(--surface-border);
  background: var(--surface-sunken);
}

.matter-dialog-step__circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--surface-border);
  color: var(--fg-subtle);
  transition: background-color 220ms ease, color 220ms ease;
}
.matter-dialog-step__circle--active {
  background: var(--accent);
  color: #fff;
  box-shadow: 0 0 0 4px var(--accent-soft);
}
.matter-dialog-step__circle--done {
  background: #10b981;
  color: #fff;
}

.matter-dialog-step__line {
  flex: 1;
  min-width: 16px;
  height: 1px;
  background: var(--surface-border);
  transition: background-color 220ms ease;
}
.matter-dialog-step__line--done {
  background: #10b981;
}

/* -----------------------------------------------------------------------
   Body
----------------------------------------------------------------------- */
.matter-dialog-body {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.matter-dialog-body > * {
  height: 100%;
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
}

/* -----------------------------------------------------------------------
   Footer
----------------------------------------------------------------------- */
.matter-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--surface-border);
  background: var(--surface-sunken);
  flex-shrink: 0;
}

/* -----------------------------------------------------------------------
   Form sections
----------------------------------------------------------------------- */
.matter-form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.matter-form-section__title {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--fg-subtle);
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px dashed var(--surface-border);
}

.matter-field-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--fg-default);
}

.matter-field-help {
  font-size: 0.75rem;
  color: var(--fg-subtle);
}

.matter-field-error {
  font-size: 0.75rem;
  color: #dc2626;
}
html.dark .matter-field-error {
  color: #fca5a5;
}

.matter-field-required {
  color: #dc2626;
}

.font-mono-num {
  font-feature-settings: 'tnum' 1, 'lnum' 1;
}

/* -----------------------------------------------------------------------
   Wizard step transitions (direction-aware)
----------------------------------------------------------------------- */
.step-fwd-enter-active,
.step-fwd-leave-active,
.step-back-enter-active,
.step-back-leave-active {
  transition: opacity 240ms ease-out, transform 240ms ease-out;
  will-change: opacity, transform;
}

.step-fwd-enter-from {
  opacity: 0;
  transform: translateX(28px);
}
.step-fwd-leave-to {
  opacity: 0;
  transform: translateX(-28px);
}

.step-back-enter-from {
  opacity: 0;
  transform: translateX(-28px);
}
.step-back-leave-to {
  opacity: 0;
  transform: translateX(28px);
}

@media (prefers-reduced-motion: reduce) {
  .step-fwd-enter-active,
  .step-fwd-leave-active,
  .step-back-enter-active,
  .step-back-leave-active {
    transition: opacity 120ms ease-out;
  }
  .step-fwd-enter-from,
  .step-fwd-leave-to,
  .step-back-enter-from,
  .step-back-leave-to {
    transform: none;
  }
}
</style>
