<template>
  <Dialog
    v-model:visible="visible"
    modal
    dismissable-mask
    class="item-detail-dialog"
    :style="{ width: 'min(48rem, 96vw)' }"
    :content-style="{ maxHeight: 'min(90vh, 48rem)' }"
    :breakpoints="{ '960px': '95vw' }"
    @hide="onHide"
  >
    <template #header>
      <div class="flex w-full min-w-0 items-center justify-between gap-3 pr-1">
        <div class="min-w-0 flex flex-col gap-0.5">
          <span class="text-xs font-medium uppercase tracking-wide text-[var(--fg-muted)]">{{
            t('signatures.composerTitle')
          }}</span>
          <span class="truncate text-sm text-[var(--fg-default)]" :title="title">{{ title }}</span>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <Button
            :label="t('common.cancel')"
            text
            size="small"
            type="button"
            @click="visible = false"
          />
          <Button
            :label="t('signatures.submitRequest')"
            icon="pi pi-check"
            size="small"
            type="button"
            :loading="saving"
            :disabled="saving"
            @click="submit"
          />
        </div>
      </div>
    </template>

    <div
      class="item-detail-scroll flex flex-1 min-h-0 flex-col gap-4 overflow-hidden lg:flex-row lg:items-stretch -mx-1 px-1"
    >
      <section class="item-detail-main flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center gap-1.5">
            <label class="m-0 text-xs font-medium uppercase tracking-wide text-[var(--fg-muted)]">{{
              t('signatures.composerMode')
            }}</label>
            <i
              class="pi pi-info-circle cursor-help text-sm text-[var(--fg-muted)]"
              v-tooltip.top="t('signatures.composerModeTooltip')"
              :aria-label="t('signatures.composerModeTooltip')"
            />
          </div>
          <SelectButton
            v-model="mode"
            :options="modeOpts"
            option-label="label"
            option-value="value"
            class="flex flex-wrap"
          />
          <p
            v-if="mode === 'sequential'"
            class="m-0 text-xs text-[var(--fg-muted)]"
          >
            {{ t('signatures.composerSequentialHint') }}
          </p>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="m-0 text-xs font-medium uppercase tracking-wide text-[var(--fg-muted)]">{{
            t('signatures.signaturesList')
          }}</label>
          <div class="flex flex-col gap-3">
            <div
              v-for="(d, i) in drafts"
              :key="i"
              class="flex flex-col gap-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-ground)]/40 p-3"
            >
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="inline-flex min-w-0 shrink-0 items-center justify-center rounded-md border border-[var(--surface-border)] bg-[var(--surface-card)] px-2 py-0.5 text-xs font-medium text-[var(--fg-default)]"
                >
                  #{{ i + 1 }}
                </span>
                <span class="min-w-0 text-xs text-[var(--fg-muted)]">{{
                  t('signatures.signerNumber', { n: i + 1 })
                }}</span>
                <div class="ml-auto flex shrink-0 items-center gap-0.5">
                  <Button
                    type="button"
                    size="small"
                    text
                    icon="pi pi-arrow-up"
                    :disabled="i === 0"
                    :aria-label="t('signatures.moveUp')"
                    v-tooltip.top="t('signatures.moveUp')"
                    @click="moveUp(i)"
                  />
                  <Button
                    type="button"
                    size="small"
                    text
                    icon="pi pi-arrow-down"
                    :disabled="i === drafts.length - 1"
                    :aria-label="t('signatures.moveDown')"
                    v-tooltip.top="t('signatures.moveDown')"
                    @click="moveDown(i)"
                  />
                  <Button
                    type="button"
                    size="small"
                    text
                    severity="danger"
                    icon="pi pi-trash"
                    :disabled="drafts.length <= 1"
                    :aria-label="t('signatures.removeSigner')"
                    v-tooltip.top="t('signatures.removeSigner')"
                    @click="removeSigner(i)"
                  />
                </div>
              </div>
              <div class="flex flex-col gap-1.5">
                <label
                  :for="`sig-kind-${i}`"
                  class="m-0 text-xs font-medium uppercase tracking-wide text-[var(--fg-muted)]"
                >{{ t('signatures.composerType') }}</label>
                <Select
                  :id="`sig-kind-${i}`"
                  :modelValue="d.kind"
                  :options="kindOpts"
                  option-label="label"
                  option-value="value"
                  class="w-full"
                  @update:modelValue="(v) => setSignerKind(i, v as 'internal' | 'external' | 'client')"
                />
              </div>
              <div v-if="d.kind === 'internal'" class="flex flex-col gap-1.5">
                <label
                  :for="`sig-user-${i}`"
                  class="m-0 text-xs font-medium uppercase tracking-wide text-[var(--fg-muted)]"
                >{{ t('signatures.internalUserLabel') }}</label>
                <Select
                  :id="`sig-user-${i}`"
                  v-model="d.userId"
                  :options="userOptions"
                  option-label="label"
                  option-value="value"
                  filter
                  class="w-full"
                  :loading="usersLoading"
                  :placeholder="t('signatures.composerUserPlaceholder')"
                />
              </div>
              <div v-else-if="d.kind === 'client'" class="flex flex-col gap-1.5">
                <label
                  :for="`sig-client-${i}`"
                  class="m-0 text-xs font-medium uppercase tracking-wide text-[var(--fg-muted)]"
                >{{ t('signatures.composerClientLabel') }}</label>
                <Select
                  :id="`sig-client-${i}`"
                  v-model="d.clientId"
                  :options="clientOptions"
                  option-label="label"
                  option-value="value"
                  filter
                  class="w-full"
                  :loading="clientsLoading"
                  :placeholder="t('signatures.composerClientPlaceholder')"
                />
              </div>
              <div v-else class="flex flex-col gap-2">
                <InputText
                  v-model="d.name"
                  :placeholder="t('signatures.extName')"
                  class="w-full"
                  :aria-label="t('signatures.extName')"
                />
                <InputText
                  v-model="d.email"
                  :placeholder="t('signatures.extEmail')"
                  class="w-full"
                  :aria-label="t('signatures.extEmail')"
                />
              </div>
            </div>
          </div>
          <Button
            type="button"
            :label="t('signatures.addSigner')"
            icon="pi pi-plus"
            outlined
            class="w-full"
            @click="addSigner"
          />
        </div>
        <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
      </section>

      <aside
        class="item-detail-sidebar flex min-h-0 w-full shrink-0 flex-col gap-2 border-t border-[var(--surface-border)] pt-4 lg:w-[min(18rem,100%)] lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0"
        :aria-label="t('signatures.composerDetailsSection')"
      >
        <h3 class="m-0 text-sm font-semibold text-[var(--fg-default)]">
          {{ t('signatures.composerDetailsHeading') }}
        </h3>
        <p class="m-0 text-xs text-[var(--fg-muted)]">{{ t('signatures.composerDetailsHint') }}</p>
        <dl class="item-detail-properties grid grid-cols-[minmax(6rem,35%)_1fr] gap-x-4 gap-y-3 text-sm">
          <dt>{{ t('signatures.composerDocLabel') }}</dt>
          <dd class="text-[var(--fg-default)]">{{ title || '—' }}</dd>
          <dt>{{ t('signatures.composerMode') }}</dt>
          <dd class="text-[var(--fg-default)]">
            {{ mode === 'sequential' ? t('signatures.modeSequential') : t('signatures.modeParallel') }}
          </dd>
          <dt>{{ t('signatures.signaturesList') }}</dt>
          <dd class="text-[var(--fg-default)]">{{ drafts.length }}</dd>
        </dl>
        <p class="m-0 text-xs font-medium text-[var(--fg-muted)]">{{ t('signatures.composerSignersSummary') }}</p>
        <ul class="m-0 list-none space-y-1.5 p-0 text-sm text-[var(--fg-default)]">
          <li
            v-for="(d, i) in drafts"
            :key="`sum-${i}`"
            class="min-w-0 break-words"
          >
            <span class="text-[var(--fg-muted)]">#{{ i + 1 }}</span>
            — {{ summaryLine(d) }}
          </li>
        </ul>
      </aside>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import SelectButton from 'primevue/selectbutton';
import { apiClient } from '@/api/client';
import { signaturesApi } from '@/api/signatures';
import '@/assets/styles/item-detail-dialog.css';

type SignerDraft =
  | { kind: 'internal'; userId: string | null }
  | { kind: 'external'; name: string; email: string }
  | { kind: 'client'; clientId: string | null };

function emptyInternal(): SignerDraft {
  return { kind: 'internal', userId: null };
}
function emptyClient(): SignerDraft {
  return { kind: 'client', clientId: null };
}

const { t } = useI18n();
const toast = useToast();
const props = defineProps<{
  modelValue: boolean;
  documentId: string;
  title: string;
}>();
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'created'): void;
}>();
const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
});
const mode = ref<'sequential' | 'parallel'>('sequential');
const drafts = ref<SignerDraft[]>([emptyInternal()]);
const userOptions = ref<{ label: string; value: string }[]>([]);
const userLabelById = computed(() => {
  const m = new Map<string, string>();
  for (const o of userOptions.value) m.set(o.value, o.label);
  return m;
});
const clientOptions = ref<{ label: string; value: string }[]>([]);
const clientLabelById = computed(() => {
  const m = new Map<string, string>();
  for (const o of clientOptions.value) m.set(o.value, o.label);
  return m;
});
const usersLoading = ref(false);
const clientsLoading = ref(false);
const saving = ref(false);
const error = ref('');

const modeOpts = [
  { label: t('signatures.modeSequential'), value: 'sequential' },
  { label: t('signatures.modeParallel'), value: 'parallel' },
];
const kindOpts = computed(() => [
  { label: t('signatures.signerInternal'), value: 'internal' as const },
  { label: t('signatures.signerClient'), value: 'client' as const },
  { label: t('signatures.signerExternal'), value: 'external' as const },
]);

function setSignerKind(i: number, k: 'internal' | 'external' | 'client') {
  const cur = drafts.value[i];
  if (!cur) return;
  if (k === 'internal' && cur.kind === 'internal') return;
  if (k === 'external' && cur.kind === 'external') return;
  if (k === 'client' && cur.kind === 'client') return;
  if (k === 'internal') drafts.value[i] = { kind: 'internal', userId: null };
  else if (k === 'client') drafts.value[i] = { kind: 'client', clientId: null };
  else drafts.value[i] = { kind: 'external', name: '', email: '' };
}

function addSigner() {
  drafts.value.push(emptyInternal());
}

function removeSigner(i: number) {
  if (drafts.value.length <= 1) return;
  drafts.value.splice(i, 1);
}

function moveUp(i: number) {
  if (i <= 0) return;
  const arr = drafts.value;
  [arr[i - 1], arr[i]] = [arr[i]!, arr[i - 1]!];
}

function moveDown(i: number) {
  if (i >= drafts.value.length - 1) return;
  const arr = drafts.value;
  [arr[i], arr[i + 1]] = [arr[i + 1]!, arr[i]!];
}

function summaryLine(d: SignerDraft): string {
  if (d.kind === 'internal') {
    const name = d.userId ? userLabelById.value.get(d.userId) : null;
    return `${name || '—'} (${t('signatures.signerTypeTagInternal')})`;
  }
  if (d.kind === 'client') {
    const name = d.clientId ? clientLabelById.value.get(d.clientId) : null;
    return `${name || '—'} (${t('signatures.signerTypeTagClient')})`;
  }
  const label = d.name.trim() || d.email.trim() || '—';
  return `${label} (${t('signatures.signerTypeTagExternal')})`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function onHide() {
  error.value = '';
  resetDrafts();
}

function resetDrafts() {
  drafts.value = [emptyInternal()];
}

async function onShow() {
  error.value = '';
  usersLoading.value = true;
  clientsLoading.value = true;
  try {
    const [usersRes, clientsRes] = await Promise.all([
      apiClient.get<{ data: { id: string; email: string; firstName?: string; lastName?: string }[] }>('/users', {
        params: { limit: 200 },
      }),
      apiClient.get<{ data: { id: string; name: string; email?: string }[] }>('/clients', { params: { limit: 200 } }),
    ]);
    const urows = (usersRes.data as any).data ?? usersRes.data;
    userOptions.value = (Array.isArray(urows) ? urows : []).map((u: any) => ({
      value: u.id,
      label: [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email,
    }));
    const crows = (clientsRes.data as any).data ?? clientsRes.data;
    clientOptions.value = (Array.isArray(crows) ? crows : []).map((c: any) => {
      const sub = c.email ? ` — ${c.email}` : '';
      return { value: c.id, label: `${c.name || '—'}${sub}` };
    });
  } finally {
    usersLoading.value = false;
    clientsLoading.value = false;
  }
}

watch(visible, (v) => {
  if (v) void onShow();
});

function rowPrefix(n: number) {
  return `${t('signatures.signerNumber', { n })}: `;
}

async function submit() {
  error.value = '';
  if (drafts.value.length < 1) {
    error.value = t('signatures.composerErrorEmptySigners');
    return;
  }

  const seenUser = new Set<string>();
  const seenEmail = new Set<string>();
  const seenClient = new Set<string>();

  for (let i = 0; i < drafts.value.length; i++) {
    const d = drafts.value[i]!;
    const n = i + 1;
    if (d.kind === 'internal') {
      if (!d.userId) {
        error.value = rowPrefix(n) + t('signatures.composerErrorSelectUser');
        return;
      }
      if (seenUser.has(d.userId)) {
        error.value = t('signatures.composerErrorDuplicateSigner');
        return;
      }
      seenUser.add(d.userId);
    } else if (d.kind === 'client') {
      if (!d.clientId) {
        error.value = rowPrefix(n) + t('signatures.composerErrorSelectClient');
        return;
      }
      if (seenClient.has(d.clientId)) {
        error.value = t('signatures.composerErrorDuplicateSigner');
        return;
      }
      seenClient.add(d.clientId);
    } else {
      if (!d.name.trim() || !d.email.trim()) {
        error.value = rowPrefix(n) + t('signatures.composerErrorNameEmail');
        return;
      }
      if (!EMAIL_RE.test(d.email.trim())) {
        error.value = rowPrefix(n) + t('signatures.composerErrorInvalidEmail');
        return;
      }
      const em = d.email.trim().toLowerCase();
      if (seenEmail.has(em)) {
        error.value = t('signatures.composerErrorDuplicateSigner');
        return;
      }
      seenEmail.add(em);
    }
  }

  const signers = drafts.value.map((d) => {
    if (d.kind === 'internal') return { userId: d.userId! };
    if (d.kind === 'client') return { clientId: d.clientId! };
    return { externalName: d.name.trim(), externalEmail: d.email.trim() };
  });

  saving.value = true;
  try {
    await signaturesApi.createRequest({
      documentId: props.documentId,
      title: props.title,
      mode: mode.value,
      signers,
    });
    toast.add({
      severity: 'success',
      summary: t('signatures.requestCreated'),
      life: 4000,
    });
    visible.value = false;
    emit('created');
  } catch (e: any) {
    error.value = e?.response?.data?.message || String(e);
  } finally {
    saving.value = false;
  }
}
</script>
