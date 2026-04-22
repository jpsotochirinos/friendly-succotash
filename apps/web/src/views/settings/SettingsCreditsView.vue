<template>
  <div class="max-w-4xl flex flex-col gap-8">
    <PageHeader
      :title="t('settings.sections.credits')"
      :subtitle="t('settings.billingUi.creditsPageSubtitle')"
    />

    <div v-if="loading" class="text-sm text-fg-muted">{{ t('app.loading') }}</div>
    <template v-else>
      <Card class="shadow-sm">
        <template #title>{{ t('settings.billingUi.creditsAvailable') }}</template>
        <template #content>
          <p class="text-3xl font-semibold text-fg mb-4">{{ wallet?.available?.toLocaleString() ?? '—' }}</p>
          <CreditUsageBar
            v-if="wallet"
            :period-credits="wallet.periodCredits"
            :period-consumed="wallet.periodConsumed"
            :balance="wallet.balance"
            :hint="t('settings.billingUi.creditsPageSubtitle')"
          />
          <Button
            v-if="canManage"
            class="mt-4"
            :label="t('settings.billingUi.creditsBuy')"
            icon="pi pi-shopping-cart"
            @click="openTopupPicker"
          />
        </template>
      </Card>

      <Card class="shadow-sm credits-alloc-card">
        <template #title>
          <div class="flex flex-wrap items-center justify-between gap-3 w-full min-w-0 pr-1">
            <span class="text-base font-semibold text-fg leading-tight">
              {{ t('settings.billingUi.creditsAllocations') }}
            </span>
            <Button
              v-if="canManage"
              type="button"
              size="small"
              :label="t('common.save')"
              icon="pi pi-check"
              :disabled="!hasAllocationChanges"
              :loading="savingAllocations"
              class="shrink-0"
              @click="saveAllAllocations"
            />
          </div>
        </template>
        <template #content>
          <div class="overflow-x-auto rounded-lg border border-surface-border">
            <table class="w-full min-w-[560px] text-left border-collapse table-fixed">
              <colgroup>
                <col class="w-[20%]" />
                <col class="w-[28%]" />
                <col class="w-[40%]" />
                <col class="w-[12%]" />
              </colgroup>
              <thead>
                <tr class="text-xs text-fg-muted border-b border-surface-border bg-[var(--surface-sunken)]">
                  <th class="py-2 px-3 font-semibold">{{ t('settings.usersName') }}</th>
                  <th class="py-2 px-3 font-semibold">{{ t('auth.email') }}</th>
                  <th class="py-2 px-3 font-semibold">
                    {{ t('settings.billingUi.creditsAllocationsColShort') }}
                  </th>
                  <th class="py-2 px-3 font-semibold text-right whitespace-nowrap">
                    {{ t('settings.billingUi.creditsMonthConsumedShort') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <AllocationRow
                  v-for="row in allocations"
                  :key="row.userId"
                  :row="row"
                  :can-manage="canManage"
                  :model-value="allocationDraft[row.userId] ?? defaultDraft(row)"
                  @update:model-value="(v) => setAllocationDraft(row.userId, v)"
                />
              </tbody>
            </table>
          </div>
        </template>
      </Card>

      <Card class="shadow-sm">
        <template #title>{{ t('settings.billingUi.creditsTransactions') }}</template>
        <template #content>
          <DataTable :value="transactions" size="small" class="text-sm">
            <Column field="createdAt" :header="'Fecha'">
              <template #body="{ data }">
                {{ formatDate(data.createdAt) }}
              </template>
            </Column>
            <Column field="reason" :header="'Motivo'" />
            <Column field="delta" :header="'Δ'">
              <template #body="{ data }">
                {{ data.delta > 0 ? '+' : '' }}{{ data.delta.toLocaleString() }}
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>
    </template>

    <Dialog
      v-model:visible="pickerOpen"
      modal
      :header="t('settings.billingUi.topupTitle')"
      :style="{ width: 'min(400px, 95vw)' }"
    >
      <div class="flex flex-col gap-3">
        <div class="flex flex-wrap gap-2">
          <Button
            v-for="n in [1000, 5000, 20000]"
            :key="n"
            :label="n === 1000 ? t('settings.billingUi.creditsPack1k') : n === 5000 ? t('settings.billingUi.creditsPack5k') : t('settings.billingUi.creditsPack20k')"
            severity="secondary"
            @click="pickAmount(n)"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm">{{ t('settings.billingUi.creditsCustom') }}</label>
          <InputNumber v-model="customCredits" :min="1" :max="1000000" class="w-full" />
        </div>
        <Button :label="t('settings.billingUi.gatewayConfirm')" @click="confirmPick" />
      </div>
    </Dialog>

    <MockPaymentGatewayDialog
      :visible="payOpen"
      :title="t('settings.billingUi.topupTitle')"
      :payment-methods="paymentMethods"
      :amount-hint="topupHint"
      :submitting="paySubmitting"
      @close="payOpen = false"
      @confirm="onTopupPay"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputNumber from 'primevue/inputnumber';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import PageHeader from '@/components/common/PageHeader.vue';
import CreditUsageBar from '@/components/billing/CreditUsageBar.vue';
import AllocationRow, { type AllocationDraft } from '@/components/billing/AllocationRow.vue';
import MockPaymentGatewayDialog from '@/components/billing/MockPaymentGatewayDialog.vue';
import {
  addPaymentMethod,
  getCreditWallet,
  listCreditAllocations,
  listCreditTransactions,
  listPaymentMethods,
  topUpCredits,
  updateCreditAllocation,
  type CreditAllocationDto,
  type CreditTransactionDto,
  type CreditWalletDto,
} from '@/api/billing';
import { useAuthStore } from '@/stores/auth.store';

const { t } = useI18n();
const toast = useToast();
const auth = useAuthStore();

const loading = ref(true);
const wallet = ref<CreditWalletDto | null>(null);
const allocations = ref<CreditAllocationDto[]>([]);
const transactions = ref<CreditTransactionDto[]>([]);
const paymentMethods = ref<Awaited<ReturnType<typeof listPaymentMethods>>>([]);

const pickerOpen = ref(false);
const payOpen = ref(false);
const paySubmitting = ref(false);
const customCredits = ref(1000);
const topupCredits = ref(1000);
const topupHint = ref('');
const savingAllocations = ref(false);

/** Last saved limits from API (null = ilimitado). */
const allocationBaseline = ref<Record<string, number | null>>({});
/** Editable drafts; keyed by userId. */
const allocationDraft = ref<Record<string, AllocationDraft>>({});

const canManage = computed(() => (auth.user?.permissions ?? []).includes('billing:manage'));

function defaultDraft(row: CreditAllocationDto): AllocationDraft {
  return {
    unlimited: row.monthlyLimit == null,
    limit: row.monthlyLimit ?? 0,
  };
}

function syncAllocationsFromApi() {
  allocationBaseline.value = {};
  allocationDraft.value = {};
  for (const row of allocations.value) {
    allocationBaseline.value[row.userId] = row.monthlyLimit;
    allocationDraft.value[row.userId] = defaultDraft(row);
  }
}

function effectiveMonthlyLimit(d: AllocationDraft): number | null {
  return d.unlimited ? null : Math.max(0, Math.floor(Number(d.limit) || 0));
}

function setAllocationDraft(userId: string, v: AllocationDraft) {
  allocationDraft.value = { ...allocationDraft.value, [userId]: v };
}

const hasAllocationChanges = computed(() => {
  for (const row of allocations.value) {
    const d = allocationDraft.value[row.userId];
    if (!d) continue;
    if (effectiveMonthlyLimit(d) !== allocationBaseline.value[row.userId]) return true;
  }
  return false;
});

async function saveAllAllocations() {
  if (!hasAllocationChanges.value) return;
  savingAllocations.value = true;
  try {
    for (const row of allocations.value) {
      const d = allocationDraft.value[row.userId];
      if (!d) continue;
      const eff = effectiveMonthlyLimit(d);
      if (eff === allocationBaseline.value[row.userId]) continue;
      await updateCreditAllocation(row.userId, { monthlyLimit: eff });
      allocationBaseline.value[row.userId] = eff;
    }
    toast.add({ severity: 'success', summary: t('settings.orgSaved'), life: 2500 });
    await load();
  } catch {
    toast.add({ severity: 'error', summary: t('settings.orgSaveError'), life: 4000 });
  } finally {
    savingAllocations.value = false;
  }
}

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
    const [w, a, tr, pm] = await Promise.all([
      getCreditWallet(),
      listCreditAllocations(),
      listCreditTransactions(30),
      listPaymentMethods(),
    ]);
    wallet.value = w;
    allocations.value = a;
    transactions.value = tr;
    paymentMethods.value = pm;
    syncAllocationsFromApi();
  } catch {
    toast.add({ severity: 'error', summary: t('settings.billingUi.loadError'), life: 4000 });
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function openTopupPicker() {
  customCredits.value = 1000;
  pickerOpen.value = true;
}

function pickAmount(n: number) {
  customCredits.value = n;
}

function confirmPick() {
  const n = Math.floor(Number(customCredits.value) || 0);
  if (n < 1) return;
  topupCredits.value = n;
  const cents = n * 10;
  topupHint.value = `PEN ${(cents / 100).toFixed(2)} (${n.toLocaleString()} créditos × 0.10)`;
  pickerOpen.value = false;
  payOpen.value = true;
}

async function onTopupPay(
  payload:
    | { type: 'existing'; paymentMethodId: string }
    | { type: 'new'; number: string; holderName: string; expMonth: number; expYear: number; cvv: string },
) {
  paySubmitting.value = true;
  try {
    let pmId: string;
    if (payload.type === 'existing') {
      pmId = payload.paymentMethodId;
    } else {
      const pm = await addPaymentMethod({
        number: payload.number,
        holderName: payload.holderName,
        expMonth: payload.expMonth,
        expYear: payload.expYear,
        cvv: payload.cvv,
      });
      pmId = pm.id;
      paymentMethods.value = await listPaymentMethods();
    }
    await topUpCredits({ credits: topupCredits.value, paymentMethodId: pmId });
    toast.add({ severity: 'success', summary: t('settings.orgSaved'), life: 3000 });
    payOpen.value = false;
    await load();
  } catch (e: unknown) {
    const msg = e && typeof e === 'object' && 'response' in e ? (e as any).response?.data?.message : null;
    toast.add({ severity: 'error', summary: msg || t('settings.orgSaveError'), life: 5000 });
  } finally {
    paySubmitting.value = false;
  }
}

</script>

<style scoped>
.credits-alloc-card :deep(.p-card-title) {
  width: 100%;
  margin-bottom: 0;
}
</style>
