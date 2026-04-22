<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import {
  getImportReview,
  commitImportBatch,
  revertImportBatch,
} from '@/api/import';
import { useAuthStore } from '@/stores/auth.store';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const batchId = ref(String(route.params.id));
const loading = ref(true);
const review = ref<{ groups?: unknown[]; items?: Record<string, unknown>[] } | null>(null);
const err = ref<string | null>(null);

async function load() {
  loading.value = true;
  err.value = null;
  try {
    review.value = await getImportReview(batchId.value);
  } catch {
    err.value = 'No se pudo cargar la revisión (¿el worker está en ejecución?)';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(
  () => route.params.id,
  (id) => {
    if (id) {
      batchId.value = String(id);
      load();
    }
  },
);

async function commit() {
  await commitImportBatch(batchId.value);
  await authStore.fetchMyOrganization();
  router.push({ name: 'trackables' });
}

async function revert() {
  await revertImportBatch(batchId.value);
  router.push({ name: 'import-migration' });
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h1 class="text-2xl font-semibold">Revisión del lote</h1>
      <div class="flex gap-2">
        <Button label="Actualizar" severity="secondary" @click="load" />
        <Button label="Revertir lote" severity="danger" outlined @click="revert" />
        <Button label="Confirmar en Alega" @click="commit" />
      </div>
    </div>

    <p v-if="err" class="text-red-600">{{ err }}</p>
    <p v-if="loading" class="text-slate-500">Cargando…</p>

    <Card v-else-if="review?.items?.length">
      <template #title>Documentos ({{ review.items.length }})</template>
      <template #content>
        <DataTable
          :value="review.items"
          scrollable
          scroll-height="480px"
          class="text-sm"
        >
          <Column field="sourcePath" header="Ruta" />
          <Column field="suggestedTrackableKey" header="Expediente sugerido" />
          <Column header="Clasificación">
            <template #body="{ data }">
              <Tag
                v-if="(data as any).classification?.kind"
                :value="(data as any).classification.kind"
                severity="info"
              />
              <span v-else>—</span>
            </template>
          </Column>
          <Column field="status" header="Estado" />
        </DataTable>
      </template>
    </Card>

    <Card v-else-if="!loading">
      <template #content>
        <p class="text-slate-600">No hay ítems o el análisis aún no terminó.</p>
      </template>
    </Card>
  </div>
</template>
