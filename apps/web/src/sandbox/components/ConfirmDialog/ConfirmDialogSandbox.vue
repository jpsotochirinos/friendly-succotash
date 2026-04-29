<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import ConfirmDialogBase from '@/components/common/ConfirmDialogBase.vue';
import type { ConfirmDialogBaseVariant } from '@/components/common/ConfirmDialogBase.vue';
import ExampleFrame from '../../_shared/ExampleFrame.vue';

const confirm = useConfirm();
const toast = useToast();

// -----------------------------------------------------------------------
// ConfirmDialogBase — new pattern
// -----------------------------------------------------------------------
type BaseCase = 'archive' | 'delete' | 'restore' | 'variant';

const baseVisible = ref(false);
const baseCase = ref<BaseCase>('variant');
const baseVariant = ref<ConfirmDialogBaseVariant>('info');
const baseLoading = ref(false);

interface BaseConfig {
  variant: ConfirmDialogBaseVariant;
  title: string;
  subject?: string;
  message: string;
  consequences?: string[];
  consequencesTitle?: string;
  typedConfirmPhrase?: string;
  typedConfirmHint?: string;
  typedConfirmLabel?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

const baseConfigs: Record<BaseCase, BaseConfig> = {
  archive: {
    variant: 'warning',
    title: 'Archivar expediente',
    subject: 'García vs. Municipalidad de Lima',
    message:
      'El expediente se moverá a Archivados y dejará de aparecer en la vista activa. Podrás reactivarlo en cualquier momento.',
    consequences: [
      'El expediente no aparecerá en el listado activo.',
      'Las notificaciones y recordatorios quedarán suspendidos.',
      'Los colaboradores perderán acceso a la vista principal.',
    ],
    consequencesTitle: 'Qué pasará',
    confirmLabel: 'Archivar',
    cancelLabel: 'Cancelar',
  },
  delete: {
    variant: 'danger',
    title: 'Eliminar permanentemente',
    subject: 'Contrato_servicios_v3_final.pdf',
    message:
      'Esta acción no se puede deshacer. El documento será eliminado de forma permanente junto con su historial de versiones.',
    consequences: [
      'El archivo se eliminará del almacenamiento permanentemente.',
      'El historial de versiones y comentarios se perderá.',
      'Los enlaces compartidos dejarán de funcionar.',
    ],
    consequencesTitle: 'Qué pasará',
    typedConfirmPhrase: 'ELIMINAR',
    typedConfirmHint: 'Esta acción es irreversible. Para confirmar, escribe la palabra a continuación.',
    typedConfirmLabel: 'Escribe ELIMINAR para confirmar',
    confirmLabel: 'Eliminar permanentemente',
    cancelLabel: 'Cancelar',
  },
  restore: {
    variant: 'success',
    title: 'Reactivar expediente',
    subject: 'Pérez vs. Constructora Andina SAC',
    message:
      'El expediente volverá a la vista activa y se reactivarán todas las notificaciones y recordatorios configurados.',
    consequences: [
      'El expediente aparecerá en el listado activo.',
      'Se reactivarán notificaciones y plazos.',
      'Los colaboradores recuperarán acceso.',
    ],
    consequencesTitle: 'Qué pasará',
    confirmLabel: 'Reactivar',
    cancelLabel: 'Cancelar',
  },
  variant: {
    variant: 'info',
    title: 'Confirmar acción',
    message: 'Esta es una confirmación de ejemplo con la variante seleccionada.',
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
  },
};

function openBase(useCase: BaseCase, variant?: ConfirmDialogBaseVariant) {
  baseCase.value = useCase;
  if (variant) baseVariant.value = variant;
  baseLoading.value = false;
  baseVisible.value = true;
}

const currentBaseConfig = ref<BaseConfig>(baseConfigs.variant);

function openVariant(v: ConfirmDialogBaseVariant) {
  currentBaseConfig.value = { ...baseConfigs.variant, variant: v, title: `Variante ${v}` };
  baseVisible.value = true;
}

function openCase(useCase: Exclude<BaseCase, 'variant'>) {
  currentBaseConfig.value = baseConfigs[useCase];
  baseVisible.value = true;
}

function openLoadingDemo() {
  currentBaseConfig.value = { ...baseConfigs.archive };
  baseLoading.value = true;
  baseVisible.value = true;
  setTimeout(() => {
    baseLoading.value = false;
    baseVisible.value = false;
    toast.add({ severity: 'success', summary: 'Expediente archivado', life: 3000 });
  }, 2000);
}

function onBaseConfirm() {
  if (baseLoading.value) return;
  baseVisible.value = false;
  toast.add({ severity: 'success', summary: 'Acción confirmada', life: 2500 });
}

// -----------------------------------------------------------------------
// Legacy useConfirm() — for reference / migration
// -----------------------------------------------------------------------
function openLegacyDanger() {
  confirm.require({
    message: '¿Eliminar permanentemente «Contrato_v2.pdf»? Esta acción no se puede deshacer.',
    header: 'Eliminar documento',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    acceptLabel: 'Eliminar',
    rejectLabel: 'Cancelar',
    accept: () => {
      toast.add({ severity: 'info', summary: 'Eliminado (simulado)', life: 3000 });
    },
  });
}

function openLegacyYesCancel() {
  confirm.require({
    message: '¿Desconectar la integración con SINOE?',
    header: 'Eliminar integración',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Sí, desconectar',
    rejectLabel: 'Cancelar',
    accept: () => {
      toast.add({ severity: 'success', summary: 'Integración desconectada (simulado)', life: 3000 });
    },
  });
}

function openLegacyDefault() {
  confirm.require({
    message: '¿Publicar el informe final?',
    header: 'Confirmar publicación',
    accept: () => {
      toast.add({ severity: 'success', summary: 'Publicado (simulado)', life: 2500 });
    },
  });
}

// -----------------------------------------------------------------------
// Table data (defined here to avoid inline object issues in template)
// -----------------------------------------------------------------------
const migrationRows = [
  { before: "acceptClass: 'p-button-danger'", after: 'variant="danger"' },
  { before: "header: 'Archivar'", after: ':title="t(...)"' },
  { before: "message: 'Esto borrará...'", after: ':message + :consequences="[...]"' },
  { before: 'Sin entidad', after: ':subject="«${entity.title}»" (obligatorio)' },
  { before: 'No admite input', after: ":typed-confirm-phrase=\"'ELIMINAR'\"" },
  { before: 'No admite loading', after: ':loading="deleting"' },
];

const antiPatternRows = [
  { bad: "window.confirm('¿Seguro?')", fix: 'ConfirmDialogBase v-model:visible' },
  { bad: '<ConfirmDialog /> dentro de v-if', fix: 'Mover al root del template' },
  { bad: 'Un <ConfirmDialog /> por fila (v-for)', fix: 'Un solo ConfirmDialogBase por vista' },
  { bad: "message: '¿Eliminar?'", fix: 'Hardcoded → usar :message="t(...)"' },
  { bad: 'accept() sin try/catch', fix: 'try/catch + toast.add de error' },
];

// Code snippets for ExampleFrame
const codeBaseArchive = `<ConfirmDialogBase
  v-model:visible="showArchive"
  variant="warning"
  title="Archivar expediente"
  subject="«García vs. Municipalidad de Lima»"
  message="El expediente se moverá a Archivados..."
  :consequences="['No aparecerá en listado activo.', ...]"
  consequences-title="Qué pasará"
  confirm-label="Archivar"
  :loading="archiving"
  @confirm="onArchive"
/>`;

const codeBaseDelete = `<ConfirmDialogBase
  v-model:visible="showDelete"
  variant="danger"
  title="Eliminar permanentemente"
  subject="«Contrato_servicios_v3.pdf»"
  message="Esta acción no se puede deshacer..."
  :consequences="['El archivo se eliminará permanentemente.', ...]"
  consequences-title="Qué pasará"
  typed-confirm-phrase="ELIMINAR"
  typed-confirm-hint="Esta acción es irreversible. Escribe la palabra:"
  typed-confirm-label="Escribe ELIMINAR para confirmar"
  confirm-label="Eliminar permanentemente"
  :loading="deleting"
  @confirm="onDelete"
/>`;

const codeBaseRestore = `<ConfirmDialogBase
  v-model:visible="showRestore"
  variant="success"
  title="Reactivar expediente"
  subject="«Pérez vs. Constructora Andina SAC»"
  message="El expediente volverá a la vista activa..."
  :consequences="['Aparecerá en listado activo.', ...]"
  consequences-title="Qué pasará"
  confirm-label="Reactivar"
  :loading="restoring"
  @confirm="onRestore"
/>`;

const codeLegacyDanger = `import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();

confirm.require({
  message: \`¿Eliminar «\${item.title}»?\`,
  header: 'Eliminar documento',
  icon: 'pi pi-exclamation-triangle',
  acceptClass: 'p-button-danger',
  acceptLabel: 'Eliminar',
  rejectLabel: 'Cancelar',
  accept: async () => {
    try {
      await api.delete(item.id);
      toast.add({ severity: 'info', summary: 'Eliminado', life: 3000 });
    } catch {
      toast.add({ severity: 'error', summary: 'Error al eliminar', life: 4000 });
    }
  },
});

// En el template (una sola vez, fuera de v-if):
// <ConfirmDialog />`;
</script>

<template>
  <div class="flex flex-col gap-10">

    <!-- Page header -->
    <div>
      <p class="text-xs font-semibold uppercase tracking-widest mb-1" style="color: var(--fg-subtle);">
        Componentes / Confirmaciones
      </p>
      <h1 class="text-2xl font-semibold m-0" style="color: var(--fg-default);">ConfirmDialog</h1>
      <p class="text-sm mt-1 m-0" style="color: var(--fg-muted);">
        Dos patrones: <strong>ConfirmDialogBase</strong> (nuevo, usar siempre en código nuevo) y
        <strong>useConfirm()</strong> (legacy, solo para referencia y migración).
      </p>
    </div>

    <!-- ================================================================ -->
    <!-- SECTION 1: ConfirmDialogBase (new pattern)                        -->
    <!-- ================================================================ -->
    <section class="flex flex-col gap-6">
      <div class="flex flex-col gap-1">
        <h2 class="text-base font-semibold m-0" style="color: var(--fg-default);">
          ConfirmDialogBase
          <span class="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            patrón actual
          </span>
        </h2>
        <p class="text-xs m-0" style="color: var(--fg-muted);">
          Componente local en
          <code class="font-mono text-xs px-1 rounded" style="background: var(--surface-sunken);">
            @/components/common/ConfirmDialogBase.vue
          </code>.
          Sin <code class="font-mono text-xs px-1 rounded" style="background: var(--surface-sunken);">ConfirmationService</code>
          — se usa con <code class="font-mono text-xs px-1 rounded" style="background: var(--surface-sunken);">v-model:visible</code> directo.
        </p>
      </div>

      <!-- Variant grid -->
      <ExampleFrame
        title="Variantes"
        description="Cada variante cambia el color del header, el icono, el disco y el botón de confirmar."
      >
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Button
            label="warning"
            icon="pi pi-exclamation-circle"
            severity="warn"
            variant="outlined"
            size="small"
            class="w-full"
            @click="openVariant('warning')"
          />
          <Button
            label="danger"
            icon="pi pi-exclamation-triangle"
            severity="danger"
            variant="outlined"
            size="small"
            class="w-full"
            @click="openVariant('danger')"
          />
          <Button
            label="success"
            icon="pi pi-check-circle"
            severity="success"
            variant="outlined"
            size="small"
            class="w-full"
            @click="openVariant('success')"
          />
          <Button
            label="info"
            icon="pi pi-info-circle"
            severity="info"
            variant="outlined"
            size="small"
            class="w-full"
            @click="openVariant('info')"
          />
        </div>
      </ExampleFrame>

      <!-- Archive (warning) -->
      <ExampleFrame
        title="Archivar expediente (warning)"
        description="Acción reversible. Subject con entidad, lista de consecuencias, botón warn."
        :code="codeBaseArchive"
      >
        <Button
          label="Demo: archivar expediente"
          icon="pi pi-inbox"
          severity="warn"
          @click="openCase('archive')"
        />
      </ExampleFrame>

      <!-- Delete permanent (danger + typed confirm) -->
      <ExampleFrame
        title="Eliminar permanentemente (danger + typedConfirmPhrase)"
        description="Acción irreversible. Requiere escribir 'ELIMINAR' para habilitar el botón confirmar."
        :code="codeBaseDelete"
      >
        <Button
          label="Demo: eliminar documento (papelera)"
          icon="pi pi-trash"
          severity="danger"
          @click="openCase('delete')"
        />
      </ExampleFrame>

      <!-- Restore (success) -->
      <ExampleFrame
        title="Reactivar expediente (success)"
        description="Confirmación positiva. Botón success, icono check-circle."
        :code="codeBaseRestore"
      >
        <Button
          label="Demo: reactivar expediente"
          icon="pi pi-replay"
          severity="success"
          @click="openCase('restore')"
        />
      </ExampleFrame>

      <!-- Loading state -->
      <ExampleFrame
        title="Estado loading"
        description="Durante el @confirm async: botón con spinner, X y Esc bloqueados, mask no cierra."
      >
        <Button
          label="Demo: loading 2s"
          icon="pi pi-bolt"
          severity="secondary"
          @click="openLoadingDemo"
        />
      </ExampleFrame>

      <!-- Migration table -->
      <div class="flex flex-col gap-3">
        <h3 class="text-sm font-semibold m-0" style="color: var(--fg-default);">Migración desde useConfirm()</h3>
        <div class="rounded-xl overflow-hidden" style="border: 1px solid var(--surface-border);">
          <table class="w-full text-xs">
            <thead>
              <tr style="background: var(--surface-sunken); border-bottom: 1px solid var(--surface-border);">
                <th class="text-left px-4 py-2 font-semibold" style="color: var(--fg-muted);">Antes (legacy)</th>
                <th class="text-left px-4 py-2 font-semibold" style="color: var(--fg-muted);">Ahora (ConfirmDialogBase)</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in migrationRows"
                :key="row.before"
                style="border-bottom: 1px solid var(--surface-border);"
              >
                <td class="px-4 py-2.5" style="color: var(--fg-default);">
                  <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">{{ row.before }}</code>
                </td>
                <td class="px-4 py-2.5" style="color: var(--fg-muted);">
                  <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">{{ row.after }}</code>
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
    <!-- SECTION 2: Legacy useConfirm() (for reference)                   -->
    <!-- ================================================================ -->
    <section class="flex flex-col gap-6">
      <div class="flex flex-col gap-1">
        <h2 class="text-base font-semibold m-0" style="color: var(--fg-default);">
          ConfirmDialog + useConfirm()
          <span class="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            legacy — migrar
          </span>
        </h2>
        <p class="text-xs m-0" style="color: var(--fg-muted);">
          El <code class="font-mono text-xs px-1 rounded" style="background: var(--surface-sunken);">&lt;ConfirmDialog /&gt;</code>
          global está montado en <code class="font-mono text-xs px-1 rounded" style="background: var(--surface-sunken);">SandboxLayout</code>.
          No usar en código nuevo — migrar a <strong>ConfirmDialogBase</strong>.
        </p>
      </div>

      <!-- Warning banner -->
      <div
        class="flex gap-3 rounded-lg px-4 py-3 text-sm"
        style="border: 1px solid #fde68a; background: #fffbeb; color: #78350f;"
      >
        <i class="pi pi-info-circle shrink-0 mt-0.5" />
        <p class="m-0">
          Montar
          <code class="font-mono text-xs px-1 rounded" style="background: rgba(120,53,15,0.1);">&lt;ConfirmDialog /&gt;</code>
          <strong>una sola vez por vista</strong> (o en el layout), nunca dentro de
          <code class="font-mono text-xs px-1 rounded" style="background: rgba(120,53,15,0.1);">v-if</code> /
          <code class="font-mono text-xs px-1 rounded" style="background: rgba(120,53,15,0.1);">v-for</code>.
        </p>
      </div>

      <ExampleFrame
        title="Variante peligro (destructiva)"
        description="acceptClass: 'p-button-danger' + icon warning. Para eliminar, purgar, revocar."
        :code="codeLegacyDanger"
      >
        <Button label="Demo: danger" icon="pi pi-exclamation-triangle" severity="danger" @click="openLegacyDanger" />
      </ExampleFrame>

      <ExampleFrame
        title="Sí / Cancelar"
        description="Sin acceptClass pero con labels custom. Para acciones que cambian estado sin ser irreversibles."
      >
        <Button label="Demo: Sí / Cancelar" icon="pi pi-exclamation-circle" severity="warn" @click="openLegacyYesCancel" />
      </ExampleFrame>

      <ExampleFrame
        title="Default (labels del locale)"
        description="Sin labels custom. Usa primeVueLocaleEs: 'Sí' / 'No'. Para acciones neutras."
      >
        <Button label="Demo: default" icon="pi pi-check" @click="openLegacyDefault" />
      </ExampleFrame>

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
              <tr
                v-for="row in antiPatternRows"
                :key="row.bad"
                style="border-bottom: 1px solid var(--surface-border);"
              >
                <td class="px-4 py-2.5" style="color: var(--fg-default);">
                  <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">{{ row.bad }}</code>
                </td>
                <td class="px-4 py-2.5" style="color: var(--fg-muted);">{{ row.fix }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Links -->
    <div class="flex flex-wrap gap-4 text-xs" style="color: var(--fg-muted);">
      <a
        href="https://primevue.org/confirmdialog/"
        target="_blank"
        rel="noopener"
        class="flex items-center gap-1 hover:text-[var(--accent)] transition-colors no-underline"
        style="color: var(--fg-muted);"
      >
        <i class="pi pi-external-link text-[10px]" />
        Docs PrimeVue ConfirmDialog
      </a>
      <span>·</span>
      <span>
        Skill:
        <code class="font-mono px-1 rounded" style="background: var(--surface-sunken);">
          .agents/skills/alega-confirm-dialog/SKILL.md
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

    <!-- ConfirmDialogBase instance — ONE per page, outside v-if -->
    <ConfirmDialogBase
      v-model:visible="baseVisible"
      v-bind="currentBaseConfig"
      :loading="baseLoading"
      @confirm="onBaseConfirm"
      @hide="baseLoading = false"
    />
  </div>
</template>
