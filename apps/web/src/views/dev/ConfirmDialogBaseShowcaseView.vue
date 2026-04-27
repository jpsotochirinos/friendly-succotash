<template>
  <div class="mx-auto max-w-5xl flex flex-col gap-8">
    <PageHeader
      title="ConfirmDialogBase (PrimeVue)"
      subtitle="Estándar Alega para confirmaciones claras (expedientes, documentos): título, asunto, consecuencias y, si aplica, texto de confirmación. Variantes danger, warning, info y success."
    />

    <div>
      <h2 class="m-0 mb-3 text-sm font-semibold text-[var(--fg-default)]">Variantes (demo mínima)</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <div
          v-for="item in variantCards"
          :key="item.variant"
          class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] p-4 shadow-sm"
        >
          <div class="mb-1 flex items-center gap-2">
            <i :class="[item.chipIcon, 'text-lg', item.chipClass]" />
            <span class="font-semibold capitalize text-[var(--fg-default)]">{{ item.variant }}</span>
          </div>
          <p class="mb-3 text-sm text-[var(--fg-muted)]">{{ item.blurb }}</p>
          <Button
            :label="item.probar"
            :severity="item.buttonSeverity"
            class="w-full"
            @click="openFor(item.variant)"
          />
        </div>
      </div>
    </div>

    <div>
      <h2 class="m-0 mb-3 text-sm font-semibold text-[var(--fg-default)]">Casos reales (copy de expedientes)</h2>
      <div class="flex flex-wrap gap-2">
        <Button
          :label="demoArchiveLabel"
          icon="pi pi-inbox"
          severity="warn"
          @click="openArchiveDemo"
        />
        <Button
          :label="demoReactivateLabel"
          icon="pi pi-replay"
          severity="success"
          @click="openReactivateDemo"
        />
        <Button
          :label="demoTrashLabel"
          icon="pi pi-trash"
          severity="danger"
          @click="openTrashPermanentDemo"
        />
        <Button :label="tryLoadingLabel" icon="pi pi-bolt" severity="secondary" @click="openLoadingDemo" />
      </div>
    </div>

    <div class="overflow-hidden rounded-lg border border-[var(--surface-border)]">
      <h2 class="m-0 border-b border-[var(--surface-border)] bg-[var(--surface-sunken)] px-4 py-2 text-sm font-semibold text-[var(--fg-default)]">
        {{ propsTableTitle }}
      </h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-[var(--surface-border)] bg-[var(--surface-raised)]">
              <th class="p-3 font-medium text-[var(--fg-default)]">Prop</th>
              <th class="p-3 font-medium text-[var(--fg-default)]">Tipo</th>
              <th class="p-3 font-medium text-[var(--fg-default)]">Obl.</th>
              <th class="p-3 font-medium text-[var(--fg-default)]">Default</th>
              <th class="p-3 font-medium text-[var(--fg-default)]">Descripción</th>
            </tr>
          </thead>
          <tbody class="text-[var(--fg-muted)]">
            <tr v-for="row in propRows" :key="row.name" class="border-b border-[var(--surface-border)] last:border-0">
              <td class="p-3 text-xs font-medium text-[var(--fg-default)]">{{ row.name }}</td>
              <td class="p-3 text-xs">{{ row.type }}</td>
              <td class="p-3">{{ row.required }}</td>
              <td class="p-3 text-xs tabular-nums">{{ row.default }}</td>
              <td class="p-3">{{ row.desc }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="rounded-lg border border-[var(--surface-border)] p-4">
      <h2 class="m-0 mb-2 text-sm font-semibold text-[var(--fg-default)]">{{ codeTitle }}</h2>
      <pre class="m-0 overflow-x-auto rounded bg-[var(--surface-sunken)] p-3 text-xs text-[var(--fg-default)]"><code>{{ exampleSnippet }}</code></pre>
    </div>

    <ConfirmDialogBase
      v-model:visible="dialogVisible"
      v-bind="activeDialogBind"
      :loading="dialogLoading"
      @confirm="onDialogConfirm"
      @hide="onDialogHide"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import PageHeader from '@/components/common/PageHeader.vue';
import ConfirmDialogBase from '@/components/common/ConfirmDialogBase.vue';
import type { ConfirmDialogBaseVariant } from '@/components/common/ConfirmDialogBase.vue';

const { t } = useI18n();

type DemoCase = 'simple' | 'archive' | 'reactivate' | 'trashPermanent';

const dialogVisible = ref(false);
const activeVariant = ref<ConfirmDialogBaseVariant>('info');
const dialogLoading = ref(false);
const demoCase = ref<DemoCase>('simple');

const sampleTitle = 'Eliminar borrador';
const sampleMessage =
  'Se eliminará el borrador. Esta acción no afecta documentos publicados. ¿Continuar?';
const sampleConfirm = 'Confirmar';
const sampleCancel = 'Cancelar';

const tryLoadingLabel = 'Probar con loading (1,5s)';
const propsTableTitle = 'Props (API)';
const codeTitle = 'Ejemplo (archivar expediente)';
const demoArchiveLabel = 'Demo: archivar expediente';
const demoReactivateLabel = 'Demo: reactivar expediente';
const demoTrashLabel = 'Demo: eliminar documento (papelera)';

const variantCards = [
  {
    variant: 'danger' as const,
    blurb: 'Acción destructiva o riesgosa. Botón aceptar en rojo.',
    probar: 'Probar',
    chipIcon: 'pi pi-exclamation-triangle',
    chipClass: 'text-red-500',
    buttonSeverity: 'danger' as const,
  },
  {
    variant: 'warning' as const,
    blurb: 'Cambio de disponibilidad reversible (archivar, ocultar).',
    probar: 'Probar',
    chipIcon: 'pi pi-exclamation-circle',
    chipClass: 'text-amber-500',
    buttonSeverity: 'warn' as const,
  },
  {
    variant: 'info' as const,
    blurb: 'Información o confirmación neutra (acento de marca).',
    probar: 'Probar',
    chipIcon: 'pi pi-info-circle',
    chipClass: 'text-accent',
    buttonSeverity: 'info' as const,
  },
  {
    variant: 'success' as const,
    blurb: 'Confirmar algo positivo o completar un paso.',
    probar: 'Probar',
    chipIcon: 'pi pi-check-circle',
    chipClass: 'text-emerald-500',
    buttonSeverity: 'success' as const,
  },
];

const archiveDemoConsequences = computed(() => [
  t('trackables.archiveConsequence1'),
  t('trackables.archiveConsequence2'),
  t('trackables.archiveConsequence3'),
]);

const reactivateDemoConsequences = computed(() => [
  t('trackables.reactivateConsequence1'),
  t('trackables.reactivateConsequence2'),
]);

const trashDemoConsequences = computed(() => [
  t('trackables.trashPermanentConsequence1'),
  t('trackables.trashPermanentConsequence2'),
]);

const activeDialogBind = computed(() => {
  if (demoCase.value === 'archive') {
    return {
      variant: 'warning' as const,
      title: t('trackables.archiveConfirmHeader'),
      subject: 'García vs. Municipalidad (demo)',
      message: t('trackables.archiveConfirmMessage'),
      consequences: archiveDemoConsequences.value,
      consequencesTitle: t('trackables.confirmConsequencesTitle'),
      confirmLabel: t('trackables.archiveActionLabel'),
      cancelLabel: t('common.cancel'),
      typedConfirmPhrase: '',
      typedConfirmHint: '',
      typedConfirmLabel: 'Confirmación',
    };
  }
  if (demoCase.value === 'reactivate') {
    return {
      variant: 'success' as const,
      title: t('trackables.reactivateConfirmHeader'),
      subject: 'García vs. Municipalidad (demo)',
      message: t('trackables.reactivateConfirmMessage'),
      consequences: reactivateDemoConsequences.value,
      consequencesTitle: t('trackables.confirmConsequencesTitle'),
      confirmLabel: t('trackables.reactivateActionLabel'),
      cancelLabel: t('common.cancel'),
      typedConfirmPhrase: '',
      typedConfirmHint: '',
      typedConfirmLabel: 'Confirmación',
    };
  }
  if (demoCase.value === 'trashPermanent') {
    return {
      variant: 'danger' as const,
      title: t('trackables.trashPermanentConfirmHeader'),
      subject: 'Contrato_servicios_2024.pdf (demo)',
      message: t('trackables.trashPermanentConfirmMessage'),
      consequences: trashDemoConsequences.value,
      consequencesTitle: t('trackables.confirmConsequencesTitle'),
      typedConfirmPhrase: t('trackables.trashPermanentTypeWord'),
      typedConfirmHint: t('trackables.trashPermanentTypedHint'),
      typedConfirmLabel: t('trackables.trashPermanentInputLabel'),
      confirmLabel: t('trackables.trashPermanentConfirmButton'),
      cancelLabel: t('common.cancel'),
    };
  }
  return {
    variant: activeVariant.value,
    title: sampleTitle,
    subject: '',
    message: sampleMessage,
    consequences: [] as string[],
    consequencesTitle: '',
    confirmLabel: sampleConfirm,
    cancelLabel: sampleCancel,
    typedConfirmPhrase: '',
    typedConfirmHint: '',
    typedConfirmLabel: 'Confirmación',
  };
});

const propRows = [
  {
    name: 'visible (v-model)',
    type: 'boolean',
    required: 'Sí',
    default: '—',
    desc: 'Visibilidad del diálogo. Usar v-model:visible',
  },
  {
    name: 'title',
    type: 'string',
    required: 'Sí',
    default: '—',
    desc: 'Título de la acción (p. ej. Archivar expediente)',
  },
  {
    name: 'message',
    type: 'string',
    required: 'Sí',
    default: '—',
    desc: 'Párrafo principal de contexto',
  },
  {
    name: 'subject',
    type: 'string',
    required: 'No',
    default: '""',
    desc: 'Nombre del expediente/documento bajo el título («…»)',
  },
  {
    name: 'consequences',
    type: 'string[]',
    required: 'No',
    default: '[]',
    desc: 'Lista “Qué pasará”',
  },
  {
    name: 'consequencesTitle',
    type: 'string',
    required: 'No',
    default: '""',
    desc: 'Encabezado de la lista (i18n, p. ej. Qué pasará)',
  },
  {
    name: 'typedConfirmPhrase',
    type: 'string',
    required: 'No',
    default: '""',
    desc: 'Si se define, el usuario debe escribirla para habilitar Confirmar',
  },
  {
    name: 'typedConfirmHint / Label / Placeholder',
    type: 'string',
    required: 'No',
    default: '—',
    desc: 'Texto de ayuda, etiqueta y placeholder del campo',
  },
  {
    name: 'variant',
    type: 'danger | warning | info | success',
    required: 'No',
    default: 'info',
    desc: 'Tono: irreversible, reversible, neutro, positivo',
  },
  {
    name: 'confirmLabel',
    type: 'string',
    required: 'No',
    default: 'Confirmar',
    desc: 'Etiqueta del botón principal (verbo concreto)',
  },
  {
    name: 'cancelLabel',
    type: 'string',
    required: 'No',
    default: 'Cancelar',
    desc: 'Etiqueta del botón secundario',
  },
  {
    name: 'loading',
    type: 'boolean',
    required: 'No',
    default: 'false',
    desc: 'Bloquea cierre y muestra loading en confirmar',
  },
  {
    name: 'onCancel',
    type: '() => void',
    required: 'No',
    default: '—',
    desc: 'Callback opcional al pulsar cancelar',
  },
  {
    name: 'hide',
    type: 'emit',
    required: '—',
    default: '—',
    desc: 'Al cerrar el diálogo',
  },
  {
    name: 'confirm',
    type: 'emit',
    required: '—',
    default: '—',
    desc: 'Al pulsar confirmar (solo si requisitos cumplidos)',
  },
];

const exampleSnippet = computed(() =>
  [
    '<' + 'script setup lang="ts">',
    "import { ref } from 'vue'",
    "import { useI18n } from 'vue-i18n'",
    "import ConfirmDialogBase from '@/components/common/ConfirmDialogBase.vue'",
    '',
    "const { t } = useI18n()",
    'const open = ref(false)',
    '<' + '/script>',
    '',
    '<template>',
    '  <ConfirmDialogBase',
    '    v-model:visible="open"',
    '    variant="warning"',
    '    :title="t(\'trackables.archiveConfirmHeader\')"',
    '    subject="García vs. Municipalidad"',
    '    :message="t(\'trackables.archiveConfirmMessage\')"',
    '    :consequences="[t(\'trackables.archiveConsequence1\'), ...]"',
    '    :consequences-title="t(\'trackables.confirmConsequencesTitle\')"',
    '    :confirm-label="t(\'trackables.archiveActionLabel\')"',
    '    :cancel-label="t(\'common.cancel\')"',
    '    @confirm="onArchive"',
    '  />',
    '<' + '/template>',
  ].join('\n'),
);

function openFor(v: ConfirmDialogBaseVariant) {
  demoCase.value = 'simple';
  activeVariant.value = v;
  dialogLoading.value = false;
  dialogVisible.value = true;
}

function openArchiveDemo() {
  demoCase.value = 'archive';
  dialogLoading.value = false;
  dialogVisible.value = true;
}

function openReactivateDemo() {
  demoCase.value = 'reactivate';
  dialogLoading.value = false;
  dialogVisible.value = true;
}

function openTrashPermanentDemo() {
  demoCase.value = 'trashPermanent';
  dialogLoading.value = false;
  dialogVisible.value = true;
}

function openLoadingDemo() {
  demoCase.value = 'simple';
  activeVariant.value = 'danger';
  dialogVisible.value = true;
  dialogLoading.value = true;
  window.setTimeout(() => {
    dialogLoading.value = false;
  }, 1500);
}

function onDialogConfirm() {
  if (dialogLoading.value) {
    return;
  }
  dialogVisible.value = false;
}

function onDialogHide() {
  dialogLoading.value = false;
}
</script>
