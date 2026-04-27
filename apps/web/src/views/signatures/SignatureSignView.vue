<template>
  <section class="flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-6">
    <PageHeader
      :title="t('signatures.signTitle')"
      :subtitle="pageSubtitle"
    />

    <div v-if="loadError" class="flex flex-col gap-3">
      <Message severity="error" :closable="false">{{ loadError }}</Message>
      <p
        v-if="conversionRetryable"
        class="m-0 text-sm text-[var(--fg-muted)]"
      >
        {{ t('signatures.pdfConversionFailedWithRetry') }}
      </p>
      <Button
        v-if="conversionRetryable"
        :label="t('signatures.retryConversion')"
        icon="pi pi-refresh"
        size="small"
        outlined
        :loading="retryLoading"
        @click="onRetryConversion"
      />
    </div>

    <div v-else-if="initialLoading" class="flex justify-center py-12">
      <ProgressSpinner
        :style="{ width: '2.5rem', height: '2.5rem' }"
        stroke-width="3"
        aria-label="Loading"
      />
    </div>

    <template v-else>
      <Message v-if="!signerId" severity="warn" :closable="false">
        {{ t('signatures.signNotASigner') }}
      </Message>

      <template v-else>
        <div
          v-if="waitingPdf"
          class="flex flex-col items-center gap-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)]/30 py-10 text-center"
        >
          <ProgressSpinner
            :style="{ width: '2.5rem', height: '2.5rem' }"
            stroke-width="3"
            aria-label="Loading"
          />
          <p class="m-0 max-w-md text-sm text-[var(--fg-muted)]">{{ t('signatures.pdfRetrySoon') }}</p>
          <p
            v-if="conversionError"
            class="m-0 max-w-lg px-4 text-left text-xs text-red-600 dark:text-red-400"
          >
            {{ t('signatures.pdfConversionFailed') }}: {{ conversionError }}
          </p>
        </div>

        <div
          v-else-if="signerId && pdfUrl"
          class="flex min-h-0 w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:gap-5"
        >
          <div class="min-h-[min(55vh,28rem)] min-w-0 flex-1 lg:min-h-[min(70vh,52rem)]">
            <div
              class="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--surface-border)] p-1"
            >
              <SignaturePdfPlacer v-model="signatureZone" :pdf-url="pdfUrl" />
            </div>
          </div>
          <aside
            class="w-full shrink-0 space-y-4 lg:sticky lg:top-4 lg:max-w-[20rem] lg:space-y-3 xl:max-w-[22rem] lg:max-h-[min(90vh,52rem)] lg:overflow-y-auto"
            :aria-label="t('signatures.otpAndConfirmSection')"
          >
            <SignatureOtpDeliveryPanel
              v-model:channel="otpChannel"
              v-model:phone="signOtpPhone"
              compact
              :show-phone-field="false"
              :phone-valid="true"
              :last-channel="lastOtpChannel"
              :error="otpRequestError"
              :disabled="waitingPdf"
              :loading="otpLoading"
              @request-otp="requestOtp"
              @clear-error="otpRequestError = ''"
            />
            <div
              class="flex flex-col gap-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)]/80 p-3 ring-1 ring-[var(--surface-border)]/50"
            >
              <div class="flex flex-col gap-1">
                <span class="text-xs font-medium uppercase tracking-wide text-[var(--fg-muted)]">
                  {{ t('signatures.otpCodeLabel') }}
                </span>
                <InputOtp v-model="otp" :length="6" :disabled="signing" />
              </div>
              <Button
                :label="t('signatures.confirmSign')"
                :disabled="otp.length !== 6 || !signatureZone"
                :loading="signing"
                icon="pi pi-check"
                class="w-full"
                size="small"
                @click="doSign"
              />
            </div>
          </aside>
        </div>
      </template>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import Button from 'primevue/button';
import InputOtp from 'primevue/inputotp';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '@/stores/auth.store';
import { signaturesApi } from '@/api/signatures';
import PageHeader from '@/components/common/PageHeader.vue';
import SignatureOtpDeliveryPanel from '@/components/signatures/SignatureOtpDeliveryPanel.vue';
import SignaturePdfPlacer, { type PlacedZone } from '@/components/signatures/SignaturePdfPlacer.vue';

const POLL_MS = 3000;
const MAX_POLLS = 80;

const { t } = useI18n();
const toast = useToast();
const route = useRoute();
const auth = useAuthStore();

const requestId = computed(() => route.params.requestId as string);
const pdfUrl = ref<string | null>(null);
const signerId = ref<string | null>(null);
const otp = ref('');
const otpChannel = ref<'email' | 'whatsapp'>('email');
/** Unused when `showPhoneField` is false; required for the shared panel model. */
const signOtpPhone = ref('');
const lastOtpChannel = ref<'email' | 'whatsapp' | null>(null);
const otpRequestError = ref('');
const otpLoading = ref(false);
const signing = ref(false);
const initialLoading = ref(true);
const loadError = ref<string | null>(null);
const waitingPdf = ref(false);
const conversionError = ref<string | null>(null);
const conversionRetryable = ref(false);
const retryLoading = ref(false);
const signatureZone = ref<PlacedZone | null>(null);

let pollCount = 0;
let pollTimer: ReturnType<typeof setInterval> | null = null;

const pageSubtitle = computed(() =>
  waitingPdf.value ? t('signatures.pdfConverting') : t('signatures.signPageSubtitle'),
);

watch(otpChannel, () => {
  otpRequestError.value = '';
});

function clearPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function fetchPdfUrl(): Promise<boolean> {
  const { data } = await signaturesApi.getPdfUrl(requestId.value);
  conversionError.value = data.conversionError;
  if (data.url) {
    pdfUrl.value = data.url;
    signatureZone.value = null;
    waitingPdf.value = false;
    conversionRetryable.value = false;
    return true;
  }
  if (data.pendingConversion) {
    waitingPdf.value = true;
    conversionRetryable.value = false;
    return false;
  }
  waitingPdf.value = false;
  const msg = data.conversionError || t('signatures.pdfLoadError');
  loadError.value = msg;
  conversionRetryable.value = !!data.conversionError;
  clearPoll();
  return false;
}

function schedulePoll() {
  clearPoll();
  pollCount = 0;
  pollTimer = setInterval(async () => {
    pollCount += 1;
    if (pollCount > MAX_POLLS) {
      clearPoll();
      waitingPdf.value = false;
      loadError.value = t('signatures.pdfPollTimeout');
      conversionRetryable.value = true;
      return;
    }
    try {
      const ok = await fetchPdfUrl();
      if (ok) clearPoll();
    } catch (e: unknown) {
      clearPoll();
      loadError.value = t('signatures.pdfLoadError');
    }
  }, POLL_MS);
}

async function onRetryConversion() {
  retryLoading.value = true;
  loadError.value = null;
  conversionRetryable.value = false;
  try {
    await signaturesApi.retryConversion(requestId.value);
    pdfUrl.value = null;
    waitingPdf.value = true;
    const ready = await fetchPdfUrl();
    if (loadError.value) {
      return;
    }
    if (!ready && waitingPdf.value) {
      schedulePoll();
    }
    toast.add({ severity: 'success', summary: t('signatures.retryConversionSent'), life: 4000 });
  } catch (e: unknown) {
    const msg =
      (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      t('signatures.pdfLoadError');
    loadError.value = String(msg);
    toast.add({ severity: 'error', summary: String(msg), life: 5000 });
  } finally {
    retryLoading.value = false;
  }
}

onMounted(async () => {
  loadError.value = null;
  conversionRetryable.value = false;
  try {
    const { data: req } = await signaturesApi.getRequest(requestId.value);
    const uid = auth.user?.id;
    const s = (req as { signers?: { id: string; user?: { id: string }; status: string }[] })
      .signers?.find(
        (x) => x.user?.id === uid && ['pending', 'notified'].includes(x.status),
      );
    signerId.value = s?.id ?? null;

    if (!signerId.value) {
      initialLoading.value = false;
      return;
    }

    const ready = await fetchPdfUrl();
    if (!ready && waitingPdf.value) {
      schedulePoll();
    } else if (!ready && !waitingPdf.value && loadError.value) {
      /* fetchPdfUrl set loadError */
    } else if (!ready && !waitingPdf.value && !loadError.value) {
      loadError.value = t('signatures.pdfLoadError');
    }
  } catch (e: unknown) {
    const msg =
      (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      t('signatures.pdfLoadError');
    loadError.value = String(msg);
    toast.add({ severity: 'error', summary: String(msg), life: 5000 });
  } finally {
    initialLoading.value = false;
  }
});

onBeforeUnmount(() => {
  clearPoll();
});

async function requestOtp() {
  if (!signerId.value) return;
  otpRequestError.value = '';
  otpLoading.value = true;
  try {
    await signaturesApi.sendOtp(signerId.value, { channel: otpChannel.value });
    lastOtpChannel.value = otpChannel.value;
    toast.add({
      severity: 'success',
      summary: t('signatures.otpSent'),
      detail: t('signatures.otpChannelHint', {
        channel:
          otpChannel.value === 'email' ? t('signatures.channelEmail') : t('signatures.channelWhatsapp'),
      }),
      life: 5000,
    });
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
    const s = msg ? String(msg) : 'Error';
    otpRequestError.value = s;
    toast.add({ severity: 'error', summary: s, life: 5000 });
  } finally {
    otpLoading.value = false;
  }
}

async function doSign() {
  if (!signerId.value || !signatureZone.value) return;
  signing.value = true;
  try {
    await signaturesApi.sign(requestId.value, {
      signerId: signerId.value,
      otpCode: otp.value,
      signatureZone: signatureZone.value,
    });
    window.location.href = '/signatures';
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
    toast.add({ severity: 'error', summary: msg ? String(msg) : 'Error', life: 5000 });
  } finally {
    signing.value = false;
  }
}
</script>
