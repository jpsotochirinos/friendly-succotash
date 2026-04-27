<template>
  <div class="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
    <div>
      <h1 class="text-xl font-semibold text-fg">{{ t('blueprint.title') }}</h1>
      <p class="mt-1 max-w-3xl text-sm text-fg-subtle">
        {{ t('blueprint.catalogSubtitle') }}
      </p>
    </div>

    <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div class="min-w-[200px] flex-1">
        <label class="mb-1 block text-xs font-medium text-fg-muted">{{ t('blueprint.filterMatter') }}</label>
        <Select
          v-model="matterFilter"
          :options="matterOptions"
          option-label="label"
          option-value="value"
          class="w-full"
        />
      </div>
      <Button
        v-if="canManage"
        type="button"
        icon="pi pi-plus"
        :label="t('blueprint.newFromSystemTitle')"
        class="shrink-0"
        :disabled="!systemRows.length"
        @click="openNewDialog"
      />
    </div>

    <Message v-if="loadErr" severity="error" :closable="false">{{ loadErr }}</Message>

    <div v-else-if="loading" class="py-10 text-center text-sm text-fg-muted">
      <i class="pi pi-spin pi-spinner mr-2" aria-hidden="true" />
      …
    </div>

    <template v-else>
      <section class="space-y-3">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-fg-muted">
          {{ t('blueprint.sectionSystem') }}
        </h2>
        <p v-if="!systemRows.length" class="text-sm text-fg-muted">{{ t('blueprint.noSystem') }}</p>
        <ul v-else class="space-y-2">
          <li
            v-for="bp in systemRows"
            :key="bp.id"
            class="flex flex-col gap-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-ground)] p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium text-fg">{{ bp.name }}</span>
                <Tag v-if="isDemo(bp)" severity="info" :value="t('blueprint.demoBadge')" />
                <Tag
                  v-if="bp.matterType"
                  severity="secondary"
                  class="text-xs capitalize"
                  :value="labelMatter(bp.matterType)"
                />
                <span v-if="!bp.isActive" class="text-xs text-amber-600">{{ t('blueprint.inactive') }}</span>
              </div>
              <p class="mt-0.5 font-mono text-xs text-fg-muted">{{ bp.code }} · id {{ bp.id.slice(0, 8) }}…</p>
              <p v-if="versionLabel(bp)" class="mt-1 text-xs text-fg-subtle">
                {{ versionLabel(bp) }}
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button
                type="button"
                size="small"
                :label="t('blueprint.view')"
                icon="pi pi-eye"
                outlined
                @click="goEditor(bp.id)"
              />
              <Button
                v-if="canManage"
                type="button"
                size="small"
                :label="t('blueprint.adopt')"
                icon="pi pi-download"
                @click="openAdoptDialog(bp)"
              />
            </div>
          </li>
        </ul>
      </section>

      <section class="space-y-3">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-fg-muted">
          {{ t('blueprint.sectionTenant') }}
        </h2>
        <p v-if="!tenantRows.length" class="text-sm text-fg-muted">{{ t('blueprint.noTenant') }}</p>
        <ul v-else class="space-y-2">
          <li
            v-for="bp in tenantRows"
            :key="bp.id"
            class="flex flex-col gap-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-ground)] p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium text-fg">{{ bp.name }}</span>
                <Tag v-if="isDemo(bp)" severity="info" :value="t('blueprint.demoBadge')" />
                <Tag
                  v-if="bp.matterType"
                  severity="secondary"
                  class="text-xs capitalize"
                  :value="labelMatter(bp.matterType)"
                />
                <span v-if="!bp.isActive" class="text-xs text-amber-600">{{ t('blueprint.inactive') }}</span>
              </div>
              <p class="mt-0.5 font-mono text-xs text-fg-muted">{{ bp.code }}</p>
              <p v-if="bp.parentBlueprint" class="mt-0.5 text-xs text-fg-subtle">
                ← {{ bp.parentBlueprint.name }} ({{ bp.parentBlueprint.code }})
              </p>
              <p v-if="versionLabel(bp)" class="mt-1 text-xs text-fg-subtle">
                {{ versionLabel(bp) }}
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button
                type="button"
                size="small"
                :label="t('blueprint.view')"
                icon="pi pi-eye"
                outlined
                @click="goEditor(bp.id)"
              />
              <Button
                v-if="canManage"
                type="button"
                size="small"
                :label="bp.isActive ? t('blueprint.deactivate') : t('blueprint.activate')"
                :icon="bp.isActive ? 'pi pi-eye-slash' : 'pi pi-check'"
                severity="secondary"
                outlined
                :loading="togglingId === bp.id"
                @click="toggleActive(bp)"
              />
            </div>
          </li>
        </ul>
      </section>
    </template>

    <Dialog
      v-model:visible="adoptDialogVisible"
      :header="t('blueprint.adoptDialogTitle')"
      modal
      class="w-full max-w-md"
      :dismissable-mask="true"
      @hide="adoptTarget = null"
    >
      <div v-if="adoptTarget" class="space-y-3 text-sm">
        <p class="text-fg-muted m-0">
          <strong class="text-fg">{{ adoptTarget.name }}</strong>
          <span class="font-mono"> ({{ adoptTarget.code }})</span>
        </p>
        <div>
          <label class="mb-1 block text-xs font-medium text-fg-muted">{{ t('blueprint.fieldCode') }}</label>
          <InputText v-model="adoptForm.code" class="w-full" autocomplete="off" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-fg-muted">{{ t('blueprint.fieldName') }}</label>
          <InputText v-model="adoptForm.name" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button :label="t('blueprint.cancel')" text @click="adoptDialogVisible = false" />
        <Button
          :label="t('blueprint.adopt')"
          icon="pi pi-check"
          :loading="adoptSubmitting"
          :disabled="!adoptForm.code.trim() || !adoptForm.name.trim()"
          @click="submitAdopt"
        />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="newDialogVisible"
      :header="t('blueprint.newFromSystemTitle')"
      modal
      class="w-full max-w-md"
    >
      <div class="space-y-3 text-sm">
        <div>
          <label class="mb-1 block text-xs font-medium text-fg-muted">{{ t('blueprint.parentTemplate') }}</label>
          <Select
            v-model="newForm.systemBlueprintId"
            :options="newParentOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            :placeholder="t('blueprint.parentTemplate')"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-fg-muted">{{ t('blueprint.fieldCode') }}</label>
          <InputText v-model="newForm.code" class="w-full" autocomplete="off" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-fg-muted">{{ t('blueprint.fieldName') }}</label>
          <InputText v-model="newForm.name" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button :label="t('blueprint.cancel')" text @click="newDialogVisible = false" />
        <Button
          :label="t('blueprint.create')"
          icon="pi pi-check"
          :loading="newSubmitting"
          :disabled="!newForm.systemBlueprintId || !newForm.code.trim() || !newForm.name.trim()"
          @click="submitNew"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import { usePermissions } from '@/composables/usePermissions';
import { useToast } from 'primevue/usetoast';
import {
  listBlueprints,
  adoptSystemBlueprint,
  createTenantFromSystem,
  patchBlueprint,
  type BlueprintListRow,
} from '@/api/blueprints';

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const { can } = usePermissions();

const canManage = computed(() => can('blueprint:manage'));

const matterOptionsBase = [
  { label: 'Litigio', value: 'litigation' },
  { label: 'Corporativo', value: 'corporate' },
  { label: 'Laboral', value: 'labor' },
  { label: 'Familia', value: 'family' },
  { label: 'Tributario', value: 'tax' },
  { label: 'Penal', value: 'criminal' },
  { label: 'Administrativo', value: 'administrative' },
  { label: 'Asesoría', value: 'advisory' },
  { label: 'Inmobiliario', value: 'real_estate' },
  { label: 'Otro', value: 'other' },
];

const matterOptions = computed(() => [
  { label: t('blueprint.allMatters'), value: '' },
  ...matterOptionsBase,
]);

const matterLabelByValue = computed(() => {
  const m = new Map<string, string>();
  for (const o of matterOptionsBase) {
    m.set(o.value, o.label);
  }
  return m;
});

function labelMatter(v: string) {
  return matterLabelByValue.value.get(v) ?? v;
}

const matterFilter = ref('');
const loading = ref(true);
const loadErr = ref('');
const systemRows = ref<BlueprintListRow[]>([]);
const tenantRows = ref<BlueprintListRow[]>([]);

const adoptDialogVisible = ref(false);
const adoptTarget = ref<BlueprintListRow | null>(null);
const adoptForm = ref({ code: '', name: '' });
const adoptSubmitting = ref(false);

const newDialogVisible = ref(false);
const newForm = ref({ systemBlueprintId: '', code: '', name: '' });
const newSubmitting = ref(false);
const newParentOptions = computed(() =>
  systemRows.value.map((bp) => ({
    label: `${bp.name} (${bp.code})`,
    value: bp.id,
  })),
);

const togglingId = ref<string | null>(null);

function isDemo(bp: BlueprintListRow) {
  return (bp.code ?? '').toLowerCase().startsWith('demo-');
}

function versionLabel(bp: BlueprintListRow) {
  const v = bp.currentVersion;
  if (!v) return '';
  const draft = v.isDraft ? t('blueprint.draftSuffix') : '';
  return t('blueprint.versionShort', { version: String(v.versionNumber), draft });
}

function goEditor(id: string) {
  void router.push({ name: 'settings-blueprint-editor', params: { id } });
}

function openAdoptDialog(bp: BlueprintListRow) {
  adoptTarget.value = bp;
  const safe = (bp.code ?? 'bp').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  adoptForm.value = {
    code: `mi-${safe}`.slice(0, 80),
    name: `${bp.name} (despacho)`,
  };
  adoptDialogVisible.value = true;
}

async function submitAdopt() {
  if (!adoptTarget.value) return;
  adoptSubmitting.value = true;
  try {
    await adoptSystemBlueprint({
      systemBlueprintId: adoptTarget.value.id,
      code: adoptForm.value.code.trim(),
      name: adoptForm.value.name.trim(),
    });
    adoptDialogVisible.value = false;
    toast.add({ severity: 'success', summary: t('blueprint.adoptedOk'), life: 2500 });
    await load();
  } catch {
    toast.add({ severity: 'error', summary: 'Error', life: 4000 });
  } finally {
    adoptSubmitting.value = false;
  }
}

function openNewDialog() {
  const first = systemRows.value[0];
  newForm.value = {
    systemBlueprintId: first?.id ?? '',
    code: '',
    name: '',
  };
  newDialogVisible.value = true;
}

async function submitNew() {
  newSubmitting.value = true;
  try {
    await createTenantFromSystem({
      systemBlueprintId: newForm.value.systemBlueprintId,
      code: newForm.value.code.trim(),
      name: newForm.value.name.trim(),
    });
    newDialogVisible.value = false;
    toast.add({ severity: 'success', summary: t('blueprint.createdOk'), life: 2500 });
    await load();
  } catch {
    toast.add({ severity: 'error', summary: 'Error', life: 4000 });
  } finally {
    newSubmitting.value = false;
  }
}

async function toggleActive(bp: BlueprintListRow) {
  togglingId.value = bp.id;
  try {
    await patchBlueprint(bp.id, { isActive: !bp.isActive });
    await load();
  } catch {
    toast.add({ severity: 'error', summary: 'Error', life: 4000 });
  } finally {
    togglingId.value = null;
  }
}

async function load() {
  loading.value = true;
  loadErr.value = '';
  try {
    const { system, tenant } = await listBlueprints(matterFilter.value || undefined);
    systemRows.value = system ?? [];
    tenantRows.value = tenant ?? [];
  } catch (e) {
    loadErr.value = t('blueprint.loadError');
    systemRows.value = [];
    tenantRows.value = [];
  } finally {
    loading.value = false;
  }
}

watch(matterFilter, () => {
  void load();
});

onMounted(() => {
  void load();
});
</script>
