<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import Message from 'primevue/message';
import Dialog from 'primevue/dialog';
import { ImportChannel } from '@tracker/shared';
import {
  createImportBatch,
  ingestImportZip,
  getImportReporting,
  getGoogleDriveAuthUrl,
  getMicrosoftAuthUrl,
  listDriveFolder,
  startDriveIngest,
  listMsGraphFolder,
  startMsGraphIngest,
} from '@/api/import';
import Uppy from '@uppy/core';
import Dashboard from '@uppy/dashboard';
import Tus from '@uppy/tus';
import '@uppy/core/css/style.css';
import '@uppy/dashboard/css/style.css';

const router = useRouter();
const name = ref(`Importación ${new Date().toLocaleString()}`);
const channel = ref(ImportChannel.WEB_ZIP);
const loading = ref(false);
const error = ref<string | null>(null);
const batchId = ref<string | null>(null);
const uploadToken = ref<string | null>(null);
const reporting = ref<Record<string, unknown> | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const uppyArea = ref<HTMLDivElement | null>(null);
let uppy: Uppy | null = null;

/** Google Drive picker */
const drivePickerOpen = ref(false);
const drivePath = ref<{ id: string; name: string }[]>([]);
const driveListing = ref<{ id: string; name: string; mimeType: string }[]>([]);
const driveLoading = ref(false);
const selectedDriveFolderId = ref<string | null>(null);

/** Microsoft */
const msSiteId = ref('');
const msPickerOpen = ref(false);
const msPath = ref<{ id: string; name: string }[]>([]);
const msListing = ref<{ id: string; name: string; folder?: boolean }[]>([]);
const msLoading = ref(false);
const selectedMsFolderId = ref<string | null>(null);

const channelOptions = computed(() => [
  { label: 'ZIP por web', value: ImportChannel.WEB_ZIP },
  { label: 'Google Drive (OAuth)', value: ImportChannel.OAUTH_DRIVE },
  { label: 'OneDrive (Microsoft)', value: ImportChannel.OAUTH_ONEDRIVE },
  { label: 'SharePoint (Microsoft)', value: ImportChannel.OAUTH_SHAREPOINT },
  { label: 'Escritorio / asistido', value: ImportChannel.DESKTOP },
]);

const isWebZip = computed(
  () => !batchId.value || channel.value === ImportChannel.WEB_ZIP,
);

function onOAuthMessage(ev: MessageEvent) {
  if (ev.origin !== window.location.origin) return;
  if (ev.data?.type !== 'import-oauth') return;
  if (ev.data.ok) {
    error.value = null;
  } else {
    error.value = 'No se pudo conectar la cuenta cloud.';
  }
}

onMounted(async () => {
  window.addEventListener('message', onOAuthMessage);
  try {
    reporting.value = (await getImportReporting()) as Record<string, unknown>;
  } catch {
    /* ignore */
  }
});

onUnmounted(() => {
  window.removeEventListener('message', onOAuthMessage);
  uppy?.destroy();
});

async function startBatch() {
  loading.value = true;
  error.value = null;
  try {
    const res = await createImportBatch({
      name: name.value,
      channel: channel.value,
      config: { dpaAcceptedAt: new Date().toISOString() },
    });
    batchId.value = res.id;
    uploadToken.value = res.uploadToken;
    if (channel.value === ImportChannel.WEB_ZIP) {
      await nextTick();
      initUppy(res.id, res.uploadToken);
    }
  } catch (e: unknown) {
    error.value = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      || 'No se pudo crear el lote';
  } finally {
    loading.value = false;
  }
}

watch(batchId, () => {
  selectedDriveFolderId.value = null;
  selectedMsFolderId.value = null;
  drivePath.value = [];
  msPath.value = [];
});

function initUppy(bid: string, token: string) {
  if (!uppyArea.value) return;
  uppy?.destroy();
  uppy = new Uppy({ restrictions: { maxFileSize: 5 * 1024 * 1024 * 1024 } })
    .use(Dashboard, {
      inline: true,
      target: uppyArea.value,
      height: 320,
    })
    .use(Tus, {
      endpoint: `${window.location.origin}/api/import/tus`,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
      },
      allowedMetaFields: ['filename', 'batchid', 'token'],
    });

  uppy.on('file-added', (file) => {
    const fname = file.name || 'upload.bin';
    /** `tus-js-client` codifica UTF-8 vía js-base64; no usar btoa() sobre el nombre. */
    uppy?.setFileMeta(file.id, {
      filename: fname,
      batchid: bid,
      token,
    });
  });

  uppy.on('complete', () => {
    router.push({ name: 'import-review', params: { id: bid } });
  });
}

async function connectGoogleDrive() {
  if (!batchId.value) return;
  const { url, error: err } = await getGoogleDriveAuthUrl(batchId.value);
  if (err || !url) {
    error.value = 'No se pudo iniciar OAuth de Google';
    return;
  }
  sessionStorage.setItem('import_oauth_batch', batchId.value);
  sessionStorage.setItem('import_oauth_kind', 'google');
  window.open(url, 'import-google-oauth', 'width=520,height=720');
}

async function connectMicrosoft() {
  if (!batchId.value) return;
  const { url, error: err } = await getMicrosoftAuthUrl(batchId.value);
  if (err || !url) {
    error.value = 'No se pudo iniciar OAuth de Microsoft';
    return;
  }
  sessionStorage.setItem('import_oauth_batch', batchId.value);
  sessionStorage.setItem('import_oauth_kind', 'microsoft');
  window.open(url, 'import-ms-oauth', 'width=520,height=720');
}

async function openDrivePicker() {
  if (!batchId.value) return;
  drivePickerOpen.value = true;
  drivePath.value = [];
  selectedDriveFolderId.value = 'root';
  await loadDriveListing('root');
}

async function loadDriveListing(parent: string) {
  if (!batchId.value) return;
  driveLoading.value = true;
  try {
    driveListing.value = await listDriveFolder(batchId.value, parent);
  } catch {
    driveListing.value = [];
    error.value = 'No se pudo listar Drive';
  } finally {
    driveLoading.value = false;
  }
}

function driveEnterFolder(row: { id: string; name: string; mimeType: string }) {
  if (row.mimeType !== 'application/vnd.google-apps.folder') return;
  drivePath.value.push({ id: row.id, name: row.name });
  selectedDriveFolderId.value = row.id;
  loadDriveListing(row.id);
}

function driveGoUp() {
  drivePath.value.pop();
  const parent = drivePath.value.length
    ? drivePath.value[drivePath.value.length - 1].id
    : 'root';
  selectedDriveFolderId.value = parent === 'root' ? 'root' : parent;
  loadDriveListing(parent);
}

async function confirmDriveImport() {
  if (!batchId.value || !selectedDriveFolderId.value) return;
  loading.value = true;
  error.value = null;
  try {
    await startDriveIngest(
      batchId.value,
      selectedDriveFolderId.value === 'root' ? undefined : selectedDriveFolderId.value,
    );
    drivePickerOpen.value = false;
    router.push({ name: 'import-review', params: { id: batchId.value } });
  } catch (e: unknown) {
    error.value =
      (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      || 'Error al encolar importación';
  } finally {
    loading.value = false;
  }
}

function msMode(): 'onedrive' | 'sharepoint' {
  return channel.value === ImportChannel.OAUTH_SHAREPOINT ? 'sharepoint' : 'onedrive';
}

async function openMsPicker() {
  if (!batchId.value) return;
  if (msMode() === 'sharepoint' && !msSiteId.value.trim()) {
    error.value = 'Indique el Site ID de SharePoint (Graph)';
    return;
  }
  error.value = null;
  msPickerOpen.value = true;
  msPath.value = [];
  selectedMsFolderId.value = 'root';
  await loadMsListing(undefined);
}

async function loadMsListing(parent: string | undefined) {
  if (!batchId.value) return;
  msLoading.value = true;
  try {
    msListing.value = await listMsGraphFolder(batchId.value, {
      mode: msMode(),
      siteId: msMode() === 'sharepoint' ? msSiteId.value.trim() : undefined,
      parent,
    });
  } catch {
    msListing.value = [];
    error.value = 'No se pudo listar OneDrive/SharePoint';
  } finally {
    msLoading.value = false;
  }
}

function msEnterFolder(row: { id: string; name: string; folder?: boolean }) {
  if (!row.folder) return;
  msPath.value.push({ id: row.id, name: row.name });
  selectedMsFolderId.value = row.id;
  loadMsListing(row.id);
}

function msGoUp() {
  msPath.value.pop();
  const parent = msPath.value.length
    ? msPath.value[msPath.value.length - 1].id
    : 'root';
  selectedMsFolderId.value = parent === 'root' ? 'root' : parent;
  loadMsListing(parent === 'root' ? undefined : parent);
}

async function confirmMsImport() {
  if (!batchId.value) return;
  loading.value = true;
  error.value = null;
  try {
    await startMsGraphIngest(batchId.value, {
      mode: msMode(),
      siteId: msMode() === 'sharepoint' ? msSiteId.value.trim() : undefined,
      rootItemId:
        selectedMsFolderId.value && selectedMsFolderId.value !== 'root'
          ? selectedMsFolderId.value
          : undefined,
    });
    msPickerOpen.value = false;
    router.push({ name: 'import-review', params: { id: batchId.value } });
  } catch (e: unknown) {
    error.value =
      (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      || 'Error al encolar importación';
  } finally {
    loading.value = false;
  }
}

async function uploadZipFallback() {
  if (!batchId.value || !fileInput.value?.files?.length) return;
  loading.value = true;
  error.value = null;
  try {
    await ingestImportZip(batchId.value, fileInput.value.files[0]);
    router.push({ name: 'import-review', params: { id: batchId.value } });
  } catch {
    error.value = 'Error al subir ZIP';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">Migración de datos</h1>
      <p class="text-slate-600 dark:text-slate-400">
        Cree un lote, suba un ZIP, use TUS para archivos grandes, o importe desde Google Drive / OneDrive /
        SharePoint.
      </p>
    </div>

    <Message v-if="reporting" severity="info" :closable="false">
      Plan: {{ (reporting as any).planTier }} — OCR: {{ (reporting as any).capabilities?.allowOcr ? 'sí' : 'no (trial)' }}
    </Message>

    <Card v-if="!batchId">
      <template #title>Nuevo lote</template>
      <template #content>
        <div class="flex flex-col gap-3">
          <label class="text-sm font-medium">Nombre</label>
          <InputText v-model="name" class="w-full" />
          <label class="text-sm font-medium">Canal</label>
          <Dropdown
            v-model="channel"
            :options="channelOptions"
            option-label="label"
            option-value="value"
            class="w-full"
          />
          <Button label="Crear lote y continuar" :loading="loading" @click="startBatch" />
          <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        </div>
      </template>
    </Card>

    <Card v-else-if="channel === ImportChannel.WEB_ZIP">
      <template #title>Subir archivos</template>
      <template #content>
        <p class="mb-2 text-sm text-slate-600">
          Arrastre un .zip o archivo único. Los metadatos TUS incluyen el token del lote.
        </p>
        <div ref="uppyArea" class="uppy-import" />
        <div class="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
          <span class="text-sm text-slate-500">Alternativa: un solo ZIP</span>
          <input ref="fileInput" type="file" accept=".zip" class="text-sm" />
          <Button label="Subir ZIP (multipart)" outlined @click="uploadZipFallback" />
        </div>
        <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
      </template>
    </Card>

    <Card v-else-if="channel === ImportChannel.OAUTH_DRIVE">
      <template #title>Google Drive</template>
      <template #content>
        <p class="mb-3 text-sm text-slate-600">
          Conecte su cuenta de Google, elija la carpeta a importar y confirme. El proceso se ejecuta en segundo plano.
        </p>
        <div class="flex flex-wrap gap-2">
          <Button label="Conectar Google Drive" outlined @click="connectGoogleDrive" />
          <Button label="Elegir carpeta e importar" :disabled="!batchId" @click="openDrivePicker" />
        </div>
        <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
      </template>
    </Card>

    <Card
      v-else-if="
        channel === ImportChannel.OAUTH_ONEDRIVE || channel === ImportChannel.OAUTH_SHAREPOINT
      "
    >
      <template #title>Microsoft 365</template>
      <template #content>
        <p class="mb-3 text-sm text-slate-600">
          Conecte Microsoft, {{ channel === ImportChannel.OAUTH_SHAREPOINT ? 'indique el Site ID de Graph y ' : '' }}
          elija la carpeta.
        </p>
        <div v-if="channel === ImportChannel.OAUTH_SHAREPOINT" class="mb-3 flex flex-col gap-1">
          <label class="text-sm font-medium">SharePoint site ID (Graph)</label>
          <InputText v-model="msSiteId" class="w-full" placeholder="p.ej. contoso.sharepoint.com:/sites/Equipo" />
        </div>
        <div class="flex flex-wrap gap-2">
          <Button label="Conectar Microsoft" outlined @click="connectMicrosoft" />
          <Button label="Elegir carpeta e importar" :disabled="!batchId" @click="openMsPicker" />
        </div>
        <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
      </template>
    </Card>

    <Card v-else>
      <template #title>Canal de escritorio</template>
      <template #content>
        <p class="text-sm text-slate-600">
          Use el agente de escritorio (próximamente) con el mismo API TUS y token de lote, o contacte soporte para
          migración asistida.
        </p>
        <p v-if="uploadToken" class="mt-2 break-all font-mono text-xs text-slate-500">
          uploadToken (corto): {{ uploadToken.slice(0, 24) }}…
        </p>
      </template>
    </Card>

    <Dialog
      v-model:visible="drivePickerOpen"
      modal
      header="Seleccionar carpeta en Drive"
      class="w-full max-w-lg"
    >
      <div class="mb-2 text-sm text-slate-500">
        <span v-for="(p, i) in drivePath" :key="p.id">{{ p.name }} / </span>
      </div>
      <Button
        v-if="drivePath.length"
        class="mb-2"
        label="Subir nivel"
        size="small"
        text
        @click="driveGoUp"
      />
      <div v-if="driveLoading" class="text-sm text-slate-500">Cargando…</div>
      <ul v-else class="max-h-64 overflow-auto border border-slate-200 rounded dark:border-slate-700">
        <li
          v-for="row in driveListing"
          :key="row.id"
          class="cursor-pointer border-b border-slate-100 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          :class="row.mimeType === 'application/vnd.google-apps.folder' ? 'font-medium' : 'text-slate-400'"
          @click="driveEnterFolder(row)"
        >
          {{ row.name }}
          <span v-if="row.mimeType === 'application/vnd.google-apps.folder'" class="text-xs text-slate-400">
            (carpeta)
          </span>
        </li>
      </ul>
      <p class="mt-2 text-xs text-slate-500">
        Carpeta seleccionada para importar: {{ selectedDriveFolderId === 'root' ? 'Raíz' : 'carpeta actual' }}
      </p>
      <template #footer>
        <Button label="Cancelar" text @click="drivePickerOpen = false" />
        <Button label="Importar esta carpeta" :loading="loading" @click="confirmDriveImport" />
      </template>
    </Dialog>

    <Dialog v-model:visible="msPickerOpen" modal header="Carpeta OneDrive / SharePoint" class="w-full max-w-lg">
      <Button v-if="msPath.length" class="mb-2" label="Subir nivel" size="small" text @click="msGoUp" />
      <div v-if="msLoading" class="text-sm text-slate-500">Cargando…</div>
      <ul v-else class="max-h-64 overflow-auto border border-slate-200 rounded dark:border-slate-700">
        <li
          v-for="row in msListing"
          :key="row.id"
          class="cursor-pointer border-b border-slate-100 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          :class="row.folder ? 'font-medium' : 'text-slate-400'"
          @click="msEnterFolder(row)"
        >
          {{ row.name }}
          <span v-if="row.folder" class="text-xs text-slate-400">(carpeta)</span>
        </li>
      </ul>
      <template #footer>
        <Button label="Cancelar" text @click="msPickerOpen = false" />
        <Button label="Importar esta carpeta" :loading="loading" @click="confirmMsImport" />
      </template>
    </Dialog>
  </div>
</template>
