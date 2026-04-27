<template>
  <div class="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h1 class="text-xl font-semibold text-fg">
          {{ blueprint?.name ?? '…' }}
        </h1>
        <p v-if="blueprint" class="mt-0.5 font-mono text-xs text-fg-muted">
          {{ blueprint.code }} · {{ blueprint.scope }}
        </p>
      </div>
      <Button
        type="button"
        :label="t('blueprint.title')"
        icon="pi pi-arrow-left"
        text
        @click="router.push({ name: 'settings-blueprints' })"
      />
    </div>

    <div v-if="loadErr" class="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
      {{ loadErr }}
    </div>
    <div v-else-if="loading" class="py-12 text-center text-fg-muted">…</div>

    <template v-else-if="blueprint">
      <TabView v-model:activeIndex="activeTab">
        <TabPanel :value="0" :header="t('settings.generalSubtitle')">
          <div class="space-y-3 text-sm">
            <div v-if="canManage && isTenant">
              <label class="text-xs text-fg-muted">{{ t('blueprint.fieldName') }}</label>
              <InputText v-model="editName" class="mt-1 w-full max-w-lg" />
            </div>
            <div v-else>
              <p class="m-0 text-fg">{{ blueprint.name }}</p>
            </div>
            <p v-if="blueprint.description" class="m-0 text-fg-subtle whitespace-pre-wrap">
              {{ blueprint.description }}
            </p>
            <p class="m-0 text-fg-subtle">
              <span class="capitalize">{{ blueprint.matterType ?? '—' }}</span>
            </p>
            <div v-if="canManage && isTenant" class="flex flex-wrap gap-2 pt-2">
              <Button
                type="button"
                :label="t('common.save')"
                icon="pi pi-check"
                :loading="saving"
                :disabled="!editName.trim() || editName === blueprint.name"
                @click="saveSummary"
              />
            </div>
            <p v-if="!isTenant" class="mt-2 text-xs text-fg-muted m-0">
              Blueprint de sistema: solo lectura. Usá «Adoptar» o «Nuevo» en el catálogo.
            </p>
          </div>
        </TabPanel>

        <TabPanel :value="1" :header="t('processTrack.stages')">
          <div v-if="treeLoading" class="text-sm text-fg-muted">…</div>
          <div v-else-if="treeErr" class="text-sm text-red-600">{{ treeErr }}</div>
          <ul v-else class="m-0 list-none space-y-4 p-0">
            <li
              v-for="(st, i) in resolvedStages"
              :key="st.code + i"
              class="rounded-lg border border-[var(--surface-border)] p-3"
            >
              <p class="m-0 font-medium text-fg">
                {{ i + 1 }}. {{ st.name }}
                <span class="font-mono text-xs text-fg-muted"> ({{ st.code }})</span>
              </p>
              <ul class="mt-2 space-y-1 pl-0 text-sm">
                <li v-for="(act, j) in st.activities" :key="act.code + j" class="flex flex-wrap items-center gap-2">
                  <i class="pi pi-circle-fill text-[6px] text-fg-muted" aria-hidden="true" />
                  <span>{{ act.name }}</span>
                  <Tag v-if="act.isMandatory" severity="warning" class="text-[10px]" :value="t('processTrack.sprint.mandatory')" />
                  <Tag v-if="act.requiresDocument" severity="info" class="text-[10px]"> doc </Tag>
                </li>
              </ul>
            </li>
          </ul>
        </TabPanel>

        <TabPanel v-if="isTenant" :value="2" :header="t('blueprint.versions')">
          <div v-if="verLoading" class="text-sm">…</div>
          <DataTable
            v-else
            :value="versions"
            size="small"
            class="text-sm"
          >
            <Column field="versionNumber" header="#" />
            <Column field="isDraft" :header="t('blueprint.createDraft')">
              <template #body="{ data }">
                <Tag v-if="data.isDraft" severity="warning" value="draft" />
                <span v-else>published</span>
              </template>
            </Column>
            <Column field="publishedAt" header="date" />
            <Column :header="t('common.actions')">
              <template #body="{ data }">
                <Button
                  v-if="data.isDraft && canManage"
                  type="button"
                  size="small"
                  :label="t('blueprint.publish')"
                  @click="publishVer(data.versionNumber)"
                />
              </template>
            </Column>
          </DataTable>
        </TabPanel>

        <TabPanel v-if="isTenant" :value="3" :header="t('blueprint.overrides')">
          <p class="text-sm text-fg-muted">
            Anulaciones JSON (avanzado). Listado de overrides del blueprint.
          </p>
          <ul v-if="overridesList.length" class="mt-2 space-y-2 text-xs font-mono">
            <li
              v-for="o in overridesList"
              :key="o.id"
              class="rounded border p-2"
            >
              {{ o.id.slice(0, 8) }} — {{ o.targetType }} / {{ o.operation }}
            </li>
          </ul>
          <p v-else class="text-sm text-fg-muted">Sin overrides.</p>
        </TabPanel>
      </TabView>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { usePermissions } from '@/composables/usePermissions';
import { useToast } from 'primevue/usetoast';
import {
  getBlueprint,
  getTenantResolved,
  listBlueprintVersions,
  publishVersion,
  listOverrides,
  patchBlueprint,
  type BlueprintListRow,
} from '@/api/blueprints';

const props = defineProps<{ id: string }>();
const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const { can } = usePermissions();
const canManage = computed(() => can('blueprint:manage'));

const activeTab = ref(0);
const loading = ref(true);
const loadErr = ref('');
const blueprint = ref<BlueprintListRow | null>(null);
const editName = ref('');

const treeLoading = ref(false);
const treeErr = ref('');
const resolvedStages = ref<
  Array<{
    code: string;
    name: string;
    activities: Array<{ code: string; name: string; isMandatory: boolean; requiresDocument?: boolean }>;
  }>
>([]);

const verLoading = ref(false);
const versions = ref<
  Array<{ id: string; versionNumber: number; isDraft: boolean; publishedAt?: string | null }>
>([]);
const saving = ref(false);
const overridesList = ref<Array<{ id: string; targetType: string; operation: string }>>([]);

const isTenant = computed(() => blueprint.value?.scope === 'tenant');

async function loadAll() {
  loading.value = true;
  loadErr.value = '';
  try {
    const bp = await getBlueprint(props.id);
    blueprint.value = bp;
    editName.value = bp.name;
  } catch {
    loadErr.value = 'No se pudo cargar el blueprint';
    blueprint.value = null;
  } finally {
    loading.value = false;
  }
  if (!blueprint.value) return;

  treeLoading.value = true;
  treeErr.value = '';
  try {
    const data = await getTenantResolved(blueprint.value.id);
    const stages = (data.stages as unknown[]) ?? [];
    resolvedStages.value = stages.map((s: unknown) => {
      const st = s as {
        code: string;
        name: string;
        _meta?: { name?: { value: string } };
        activities?: unknown[];
      };
      const title = st._meta?.name?.value ?? st.name;
      return {
        code: st.code,
        name: title,
        activities: (st.activities ?? []).map((a: unknown) => {
          const act = a as {
            code: string;
            name: string;
            isMandatory?: boolean;
            requiresDocument?: boolean;
            _p?: { name?: { value: string } };
          };
          return {
            code: act.code,
            name: act._p?.name?.value ?? act.name,
            isMandatory: !!act.isMandatory,
            requiresDocument: !!act.requiresDocument,
          };
        }),
      };
    });
  } catch (e) {
    treeErr.value = 'No se pudo resolver el árbol (¿permisos o blueprint de sistema sin versión publicada?)';
    resolvedStages.value = [];
  } finally {
    treeLoading.value = false;
  }

  if (blueprint.value.scope === 'tenant') {
    verLoading.value = true;
    try {
      versions.value = await listBlueprintVersions(blueprint.value.id);
      overridesList.value = await listOverrides(blueprint.value.id);
    } catch {
      versions.value = [];
      overridesList.value = [];
    } finally {
      verLoading.value = false;
    }
  } else {
    versions.value = [];
    overridesList.value = [];
  }
}

async function saveSummary() {
  if (!blueprint.value) return;
  saving.value = true;
  try {
    await patchBlueprint(blueprint.value.id, { name: editName.value.trim() });
    toast.add({ severity: 'success', summary: t('common.success'), life: 2000 });
    await loadAll();
  } catch {
    toast.add({ severity: 'error', summary: 'Error', life: 3000 });
  } finally {
    saving.value = false;
  }
}

async function publishVer(versionNumber: number) {
  if (!blueprint.value) return;
  try {
    await publishVersion(blueprint.value.id, versionNumber);
    toast.add({ severity: 'success', summary: t('blueprint.publish'), life: 2000 });
    await loadAll();
  } catch {
    toast.add({ severity: 'error', summary: 'Error', life: 3000 });
  }
}

watch(
  () => props.id,
  () => {
    void loadAll();
  },
);

onMounted(() => {
  void loadAll();
});
</script>
