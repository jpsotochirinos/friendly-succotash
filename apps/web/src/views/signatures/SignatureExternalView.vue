<template>
  <AuthShell wide>
    <template #title>{{ t('signatures.externalTitle') }}</template>
    <template #subtitle>
      <span v-if="preview?.valid">{{ preview.documentTitle }} — {{ preview.signerName }}</span>
    </template>
    <div v-if="!token" class="text-sm text-red-600">{{ t('signatures.missingToken') }}</div>
    <div v-else-if="preview && preview.valid === false" class="text-sm">{{ t('signatures.linkExpired') }}</div>
    <div v-else class="flex w-full max-w-7xl flex-col gap-4">
      <p class="m-0 text-sm font-medium">{{ preview?.organizationName }}</p>

      <div class="flex min-h-0 w-full min-w-0 flex-col gap-5 lg:flex-row lg:items-start">
        <div class="min-h-0 min-w-0 flex-1 space-y-4">
          <div
            v-if="pdfUrl"
            class="min-h-[min(50vh,24rem)] min-w-0 overflow-hidden rounded-xl border border-[var(--surface-border)] p-1 lg:min-h-[min(60vh,36rem)]"
          >
            <SignaturePdfPlacer v-model="signatureZone" :pdf-url="pdfUrl" />
          </div>
          <p v-else-if="preview?.valid" class="m-0 text-sm text-[var(--fg-muted)]">
            {{ t('signatures.pdfRetrySoon') }}
          </p>

          <div class="flex flex-col gap-1.5">
            <span class="text-xs font-medium uppercase tracking-wide text-[var(--fg-muted)]"
              >{{ t('signatures.modeDraw') }} / {{ t('signatures.modeUpload') }}</span
            >
            <SelectButton
              v-model="signatureInputMode"
              :options="sigModeOpts"
              option-label="label"
              option-value="value"
              class="flex flex-wrap"
            />
          </div>

          <p v-if="signatureInputMode === 'draw'" class="m-0 text-sm">
            {{ t('signatures.drawHint') }}
          </p>
          <SignatureCanvas v-if="signatureInputMode === 'draw'" @confirm="onDrawConfirm" />
          <SignatureImageInput v-else @confirm="onImageConfirm" @clear="onImageClear" />
        </div>

        <aside
          class="w-full shrink-0 space-y-4 lg:sticky lg:top-0 lg:max-w-[20rem] xl:max-w-[22rem] lg:max-h-[min(92vh,56rem)] lg:overflow-y-auto"
          :aria-label="t('signatures.otpAndConfirmSection')"
        >
          <SignatureOtpDeliveryPanel
            v-model:channel="otpChannel"
            v-model:phone="phone"
            compact
            :show-phone-field="true"
            :phone-valid="phoneValid"
            :last-channel="lastOtpChannel"
            :error="flowError"
            :loading="otpLoading"
            @request-otp="sendOtp"
            @clear-error="flowError = ''"
          />
          <div
            class="flex flex-col gap-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)]/80 p-3"
          >
            <div class="flex flex-col gap-1">
              <span class="text-xs font-medium uppercase tracking-wide text-[var(--fg-muted)]">
                {{ t('signatures.otpCodeLabel') }}
              </span>
              <InputOtp v-model="otp" :length="6" :disabled="signing" />
            </div>
            <Message v-if="signError" severity="error" :closable="true" @close="signError = ''">
              {{ signError }}
            </Message>
            <Button
              :label="t('signatures.confirmSign')"
              :disabled="otp.length !== 6 || !dataUrl || !signatureZone || signing"
              :loading="signing"
              class="w-full"
              @click="doSign"
            />
          </div>
        </aside>
      </div>
    </div>
  </AuthShell>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import InputOtp from 'primevue/inputotp';
import Message from 'primevue/message';
import SelectButton from 'primevue/selectbutton';
import { signaturesApi } from '@/api/signatures';
import AuthShell from '@/components/auth/AuthShell.vue';
import SignatureOtpDeliveryPanel from '@/components/signatures/SignatureOtpDeliveryPanel.vue';
import SignatureCanvas from '@/components/signatures/SignatureCanvas.vue';
import SignatureImageInput from '@/components/signatures/SignatureImageInput.vue';
import SignaturePdfPlacer, { type PlacedZone } from '@/components/signatures/SignaturePdfPlacer.vue';

const { t } = useI18n();
const toast = useToast();
const route = useRoute();
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''));
const preview = ref<Record<string, unknown> | null>(null);
const otp = ref('');
const otpLoading = ref(false);
const dataUrl = ref<string | null>(null);
const signing = ref(false);
const pdfUrl = ref<string | null>(null);
const signatureZone = ref<PlacedZone | null>(null);
const otpChannel = ref<'email' | 'whatsapp'>('email');
const phone = ref('');
const lastOtpChannel = ref<'email' | 'whatsapp' | null>(null);
const flowError = ref('');
const signError = ref('');
const signatureInputMode = ref<'draw' | 'upload'>('draw');

const phoneValid = computed(() => {
  const s = phone.value.trim();
  if (!s) return false;
  if (!/^\s*\+?[\d\s-]{7,}\s*$/.test(s)) return false;
  const digits = s.replace(/\D/g, '');
  return digits.length >= 7;
});

const sigModeOpts = computed(() => [
  { label: t('signatures.modeDraw'), value: 'draw' as const },
  { label: t('signatures.modeUpload'), value: 'upload' as const },
]);

function onDrawConfirm(d: string) {
  dataUrl.value = d;
}
function onImageConfirm(d: string) {
  dataUrl.value = d;
}
function onImageClear() {
  dataUrl.value = null;
}

watch(otpChannel, () => {
  flowError.value = '';
});
watch(signatureInputMode, () => {
  dataUrl.value = null;
  signError.value = '';
});

onMounted(async () => {
  if (!token.value) return;
  const { data } = await signaturesApi.externalPreview(token.value);
  preview.value = data;
  if (data && (data as { valid?: boolean }).valid) {
    try {
      const { data: pdf } = await signaturesApi.externalPdfUrl(token.value);
      if (pdf?.url) {
        pdfUrl.value = pdf.url;
        signatureZone.value = null;
      }
    } catch {
      pdfUrl.value = null;
    }
  }
});

async function sendOtp() {
  if (!token.value) return;
  if (otpChannel.value === 'whatsapp' && !phoneValid.value) {
    flowError.value = t('signatures.otpPhoneInvalid');
    return;
  }
  flowError.value = '';
  otpLoading.value = true;
  try {
    await signaturesApi.externalOtp(token.value, {
      channel: otpChannel.value,
      phone: otpChannel.value === 'whatsapp' ? phone.value.trim() : undefined,
    });
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
    const msg =
      (e as { response?: { data?: { message?: string } } })?.response?.data?.message || String(e);
    flowError.value = String(msg);
    toast.add({ severity: 'error', summary: String(msg), life: 6000 });
  } finally {
    otpLoading.value = false;
  }
}

async function doSign() {
  if (!token.value || !dataUrl.value || !signatureZone.value) return;
  signError.value = '';
  signing.value = true;
  try {
    await signaturesApi.externalSign(
      token.value,
      otp.value,
      dataUrl.value,
      signatureZone.value,
    );
    window.location.href = '/';
  } catch (e: unknown) {
    const msg =
      (e as { response?: { data?: { message?: string } } })?.response?.data?.message || String(e);
    signError.value = String(msg);
    toast.add({ severity: 'error', summary: String(msg), life: 6000 });
  } finally {
    signing.value = false;
  }
}
</script>
