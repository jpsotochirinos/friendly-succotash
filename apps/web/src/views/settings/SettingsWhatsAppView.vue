<template>
  <div class="max-w-2xl flex flex-col gap-8">
    <PageHeader :title="t('settings.sections.whatsapp')" :subtitle="t('settings.whatsappSubtitle')" />

    <div
      class="text-sm rounded-lg px-3 py-2 border"
      :style="{
        borderColor: 'var(--border-subtle)',
        background: 'var(--surface-raised)',
        color: 'var(--fg-muted)',
      }"
    >
      <span class="font-medium" :style="{ color: 'var(--fg-default)' }">{{ t('settings.whatsappProvider') }}:</span>
      {{ account.provider }} — {{ t('settings.whatsappWebhookHint') }}
    </div>

    <section v-if="canAdmin" class="space-y-4">
      <h2 class="text-base font-semibold text-fg">{{ t('settings.whatsappFirmSection') }}</h2>
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-fg">{{ t('settings.whatsappPhoneNumberId') }}</label>
        <InputText v-model="account.phoneNumberId" class="w-full" :disabled="saving" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-fg">{{ t('settings.whatsappDisplayPhone') }}</label>
        <InputText v-model="account.displayPhone" class="w-full" placeholder="+51 9..." :disabled="saving" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-fg">{{ t('settings.whatsappProviderField') }}</label>
        <Dropdown
          v-model="account.provider"
          :options="providerOptions"
          option-label="label"
          option-value="value"
          class="w-full"
          :disabled="saving"
        />
      </div>
      <div class="flex items-center gap-2">
        <ToggleSwitch v-model="account.briefingEnabled" :disabled="saving" />
        <span class="text-sm text-fg">{{ t('settings.whatsappBriefingEnabled') }}</span>
      </div>
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <ToggleSwitch v-model="orgWhatsAppChannel" :disabled="saving" />
          <span class="text-sm text-fg">{{ t('settings.whatsappNotifOrgTitle') }}</span>
        </div>
        <p class="text-xs text-fg-muted">{{ t('settings.whatsappNotifOrgHint') }}</p>
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-fg">{{ t('settings.whatsappBriefingCron') }}</label>
        <InputText v-model="account.briefingCron" class="w-full" placeholder="0 8 * * *" :disabled="saving" />
        <p class="text-xs text-fg-muted">{{ t('settings.whatsappCronHint') }}</p>
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-fg">{{ t('settings.whatsappBriefingGroupId') }}</label>
        <InputText v-model="briefingGroupIdStr" class="w-full" :disabled="saving" />
      </div>
      <Button :label="t('common.save')" icon="pi pi-check" :loading="saving" @click="saveAccount" />
    </section>

    <section class="space-y-4">
      <h2 class="text-base font-semibold text-fg">{{ t('settings.whatsappNotifPersonalTitle') }}</h2>
      <div v-for="row in eventOptIn" :key="row.eventType" class="flex items-center gap-2">
        <ToggleSwitch
          :model-value="row.enabled"
          :disabled="eventOptInLoading"
          @update:model-value="(v: boolean) => onEventOptInChange(row.eventType, v)"
        />
        <span class="text-sm text-fg">{{
          t(`settings.whatsappNotif_${row.eventType}` as any)
        }}</span>
      </div>
    </section>

    <section class="space-y-4">
      <h2 class="text-base font-semibold text-fg">{{ t('settings.whatsappPersonalSection') }}</h2>
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-fg">{{ t('settings.whatsappMyNumber') }}</label>
        <InputText v-model="personalPhone" class="w-full" placeholder="+519..." :disabled="verifyLoading" />
      </div>
      <div class="flex flex-wrap gap-2">
        <Button
          :label="t('settings.whatsappSendCode')"
          icon="pi pi-send"
          severity="secondary"
          :loading="verifyLoading"
          @click="sendCode"
        />
        <InputText v-model="confirmCode" class="w-32" placeholder="000000" maxlength="6" />
        <Button :label="t('settings.whatsappConfirmCode')" :loading="confirmLoading" @click="confirmCodeFn" />
      </div>
    </section>

    <section class="space-y-3">
      <h2 class="text-base font-semibold text-fg">{{ t('settings.whatsappAssistantThreadTitle') }}</h2>
      <p class="text-sm text-fg-muted">{{ t('settings.whatsappAssistantThreadHint') }}</p>
      <Button
        :label="t('settings.whatsappAssistantThreadClear')"
        icon="pi pi-trash"
        severity="danger"
        outlined
        :loading="clearAssistantLoading"
        @click="onClearAssistantThread"
      />
    </section>

    <section v-if="canAdmin" class="space-y-3">
      <h2 class="text-base font-semibold text-fg">{{ t('settings.whatsappMembersTitle') }}</h2>
      <DataTable :value="members" size="small" striped-rows>
        <Column field="email" :header="t('settings.usersName')" />
        <Column field="phoneNumber" header="WhatsApp" />
        <Column field="receiveBriefing" :header="t('settings.whatsappReceiveBriefing')">
          <template #body="{ data }">
            {{ data.receiveBriefing ? t('settings.yes') : t('settings.no') }}
          </template>
        </Column>
      </DataTable>
    </section>

    <section v-if="canAdmin" class="space-y-3">
      <h2 class="text-base font-semibold text-fg">{{ t('settings.whatsappLogsTitle') }}</h2>
      <DataTable :value="recentMessages" size="small" striped-rows>
        <Column field="timestamp" header="Fecha" />
        <Column field="direction" header="Dir" />
        <Column field="fromPhone" header="Desde" />
        <Column field="body" header="Mensaje" />
      </DataTable>
    </section>

    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import PageHeader from '@/components/common/PageHeader.vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import ToggleSwitch from 'primevue/toggleswitch';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import ConfirmDialog from 'primevue/confirmdialog';
import { useAuthStore } from '@/stores/auth.store';
import { deleteWhatsAppAssistantThread } from '@/api/assistant';
import {
  getWhatsAppAccount,
  getWhatsAppMe,
  getWhatsAppEventOptIn,
  updateWhatsAppAccount,
  updateWhatsAppEventOptIn,
  verifyWhatsAppPhone,
  confirmWhatsAppCode,
  listWhatsAppMembers,
  listRecentWhatsAppMessages,
  type WhatsAppAccountDto,
  type WhatsAppEventOptInRow,
  type WhatsAppMemberRow,
  type WhatsAppMessageRow,
} from '@/api/whatsapp';

const { t } = useI18n();
const toast = useToast();
const confirm = useConfirm();
const auth = useAuthStore();

const canAdmin = computed(() => auth.user?.permissions?.includes('org:manage') ?? false);

const account = ref<WhatsAppAccountDto>({
  phoneNumberId: '',
  displayPhone: '',
  provider: 'twilio',
  groupIds: [],
  briefingCron: '0 8 * * *',
  briefingEnabled: false,
  briefingGroupId: null,
  notificationsEnabled: true,
});

const orgWhatsAppChannel = ref(true);

const eventOptIn = ref<WhatsAppEventOptInRow[]>([]);
const eventOptInLoading = ref(false);

const briefingGroupIdStr = computed({
  get: () => account.value.briefingGroupId ?? '',
  set: (v: string) => {
    account.value.briefingGroupId = v || null;
  },
});

const providerOptions = [
  { label: 'Twilio', value: 'twilio' },
  { label: '360dialog', value: 'dialog360' },
  { label: 'Meta', value: 'meta' },
];

const saving = ref(false);
const personalPhone = ref('');
const confirmCode = ref('');
const verifyLoading = ref(false);
const confirmLoading = ref(false);
const members = ref<WhatsAppMemberRow[]>([]);
const recentMessages = ref<WhatsAppMessageRow[]>([]);
const clearAssistantLoading = ref(false);

async function load() {
  try {
    account.value = await getWhatsAppAccount();
    orgWhatsAppChannel.value = account.value.notificationsEnabled !== false;
    eventOptIn.value = await getWhatsAppEventOptIn();
    const me = await getWhatsAppMe();
    if (me.phoneNumber) personalPhone.value = me.phoneNumber;
    if (canAdmin.value) {
      members.value = await listWhatsAppMembers();
      recentMessages.value = await listRecentWhatsAppMessages();
    }
  } catch {
    toast.add({ severity: 'error', summary: t('settings.whatsappLoadError'), life: 4000 });
  }
}

onMounted(load);

async function onEventOptInChange(eventType: string, enabled: boolean) {
  const next = eventOptIn.value.map((r) => (r.eventType === eventType ? { ...r, enabled } : r));
  eventOptIn.value = next;
  eventOptInLoading.value = true;
  try {
    await updateWhatsAppEventOptIn(next);
    toast.add({ severity: 'success', summary: t('settings.whatsappNotifSaved'), life: 2500 });
  } catch {
    toast.add({ severity: 'error', summary: t('settings.whatsappNotifSaveError'), life: 4000 });
    await load();
  } finally {
    eventOptInLoading.value = false;
  }
}

async function saveAccount() {
  saving.value = true;
  try {
    account.value = await updateWhatsAppAccount({
      phoneNumberId: account.value.phoneNumberId,
      displayPhone: account.value.displayPhone,
      provider: account.value.provider,
      groupIds: account.value.groupIds,
      briefingCron: account.value.briefingCron,
      briefingEnabled: account.value.briefingEnabled,
      briefingGroupId: account.value.briefingGroupId ?? undefined,
      notificationsEnabled: orgWhatsAppChannel.value,
    });
    toast.add({ severity: 'success', summary: t('settings.orgSaved'), life: 3000 });
    await load();
  } catch {
    toast.add({ severity: 'error', summary: t('settings.orgSaveError'), life: 4000 });
  } finally {
    saving.value = false;
  }
}

async function sendCode() {
  verifyLoading.value = true;
  try {
    await verifyWhatsAppPhone(personalPhone.value.trim());
    toast.add({ severity: 'success', summary: t('settings.whatsappCodeSent'), life: 4000 });
  } catch {
    toast.add({ severity: 'error', summary: t('settings.whatsappVerifyError'), life: 4000 });
  } finally {
    verifyLoading.value = false;
  }
}

async function confirmCodeFn() {
  confirmLoading.value = true;
  try {
    await confirmWhatsAppCode(confirmCode.value.trim());
    toast.add({ severity: 'success', summary: t('settings.whatsappVerified'), life: 4000 });
    await load();
  } catch {
    toast.add({ severity: 'error', summary: t('settings.whatsappConfirmError'), life: 4000 });
  } finally {
    confirmLoading.value = false;
  }
}

function onClearAssistantThread() {
  confirm.require({
    message: t('settings.whatsappAssistantThreadConfirm'),
    header: t('settings.whatsappAssistantThreadConfirmHeader'),
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    acceptLabel: t('common.delete'),
    rejectLabel: t('common.cancel'),
    accept: async () => {
      clearAssistantLoading.value = true;
      try {
        const r = await deleteWhatsAppAssistantThread();
        toast.add({
          severity: 'success',
          summary: r.deleted ? t('settings.whatsappAssistantThreadCleared') : t('settings.whatsappAssistantThreadNone'),
          life: 3500,
        });
      } catch {
        toast.add({ severity: 'error', summary: t('settings.whatsappAssistantThreadClearError'), life: 4000 });
      } finally {
        clearAssistantLoading.value = false;
      }
    },
  });
}

</script>
