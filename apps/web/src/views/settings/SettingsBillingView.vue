<template>
  <div class="max-w-4xl flex flex-col gap-8">
    <PageHeader
      :title="t('settings.sections.billing')"
      :subtitle="t('settings.billingUi.billingPageSubtitle')"
    />

    <div v-if="loading" class="text-sm text-fg-muted">{{ t('app.loading') }}</div>
    <template v-else>
      <Card class="shadow-sm">
        <template #title>{{ t('settings.billingUi.billingPaymentMethods') }}</template>
        <template #content>
          <div class="flex flex-wrap gap-2 mb-4">
            <Button
              v-if="canManage"
              :label="t('settings.billingUi.billingAddCard')"
              icon="pi pi-plus"
              @click="addOpen = true"
            />
          </div>
          <ul v-if="paymentMethods.length" class="space-y-2">
            <li
              v-for="pm in paymentMethods"
              :key="pm.id"
              class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-border px-3 py-2"
            >
              <span class="text-sm">
                {{ pm.brand }} ···· {{ pm.last4 }} ({{ pm.expMonth }}/{{ pm.expYear }})
                <Tag v-if="pm.isDefault" class="ml-2" severity="success" :value="t('settings.billingUi.billingDefault')" />
              </span>
              <span v-if="canManage" class="flex gap-2">
                <Button
                  v-if="!pm.isDefault"
                  size="small"
                  text
                  :label="t('settings.billingUi.billingDefault')"
                  @click="setDef(pm.id)"
                />
                <Button
                  size="small"
                  severity="danger"
                  text
                  :label="t('settings.billingUi.billingRemoveCard')"
                  @click="remove(pm.id)"
                />
              </span>
            </li>
          </ul>
          <p v-else class="text-sm text-fg-muted">{{ t('settings.billingUi.billingNoCards') }}</p>
        </template>
      </Card>

      <Card class="shadow-sm">
        <template #title>{{ t('settings.billingUi.billingInvoices') }}</template>
        <template #content>
          <DataTable v-if="invoices.length" :value="invoices" size="small" class="text-sm">
            <Column field="number" :header="'#'" />
            <Column field="issuedAt" :header="'Fecha'">
              <template #body="{ data }">
                {{ formatDate(data.issuedAt) }}
              </template>
            </Column>
            <Column field="amountCents" :header="'Monto'">
              <template #body="{ data }">
                {{ (data.amountCents / 100).toFixed(2) }} {{ data.currency }}
              </template>
            </Column>
            <Column field="status" :header="'Estado'" />
            <Column :header="t('settings.billingUi.billingInvoiceDownload')">
              <template #body>
                <Button
                  size="small"
                  disabled
                  v-tooltip.top="t('settings.billingUi.billingDownloadSoon')"
                  :label="t('settings.billingUi.billingInvoiceDownload')"
                />
              </template>
            </Column>
          </DataTable>
          <p v-else class="text-sm text-fg-muted">{{ t('settings.billingUi.billingNoInvoices') }}</p>
        </template>
      </Card>
    </template>

    <MockPaymentGatewayDialog
      :visible="addOpen"
      :title="t('settings.billingUi.billingAddCard')"
      :payment-methods="[]"
      :submitting="addSubmitting"
      @close="addOpen = false"
      @confirm="onAddCard"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import PageHeader from '@/components/common/PageHeader.vue';
import MockPaymentGatewayDialog from '@/components/billing/MockPaymentGatewayDialog.vue';
import {
  addPaymentMethod,
  deletePaymentMethod,
  listInvoices,
  listPaymentMethods,
  setDefaultPaymentMethod,
  type InvoiceDto,
  type PaymentMethodDto,
} from '@/api/billing';
import { useAuthStore } from '@/stores/auth.store';

const { t } = useI18n();
const toast = useToast();
const auth = useAuthStore();

const loading = ref(true);
const addOpen = ref(false);
const addSubmitting = ref(false);
const paymentMethods = ref<PaymentMethodDto[]>([]);
const invoices = ref<InvoiceDto[]>([]);

const canManage = computed(() => (auth.user?.permissions ?? []).includes('billing:manage'));

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

async function load() {
  loading.value = true;
  try {
    const [pm, inv] = await Promise.all([listPaymentMethods(), listInvoices({ limit: 50 })]);
    paymentMethods.value = pm;
    invoices.value = inv.items;
  } catch {
    toast.add({ severity: 'error', summary: t('settings.billingUi.loadError'), life: 4000 });
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function setDef(id: string) {
  try {
    await setDefaultPaymentMethod(id);
    await load();
  } catch {
    toast.add({ severity: 'error', summary: t('settings.orgSaveError'), life: 4000 });
  }
}

async function remove(id: string) {
  try {
    await deletePaymentMethod(id);
    await load();
  } catch {
    toast.add({ severity: 'error', summary: t('settings.orgSaveError'), life: 4000 });
  }
}

async function onAddCard(
  payload:
    | { type: 'existing'; paymentMethodId: string }
    | { type: 'new'; number: string; holderName: string; expMonth: number; expYear: number; cvv: string },
) {
  if (payload.type === 'existing') {
    addOpen.value = false;
    return;
  }
  addSubmitting.value = true;
  try {
    await addPaymentMethod({
      number: payload.number,
      holderName: payload.holderName,
      expMonth: payload.expMonth,
      expYear: payload.expYear,
      cvv: payload.cvv,
    });
    toast.add({ severity: 'success', summary: t('settings.billingUi.savedCardOk'), life: 3000 });
    addOpen.value = false;
    await load();
  } catch {
    toast.add({ severity: 'error', summary: t('settings.orgSaveError'), life: 4000 });
  } finally {
    addSubmitting.value = false;
  }
}
</script>
