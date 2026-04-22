<template>
  <div class="max-w-5xl flex flex-col gap-8">
    <PageHeader
      :title="t('settings.sections.plan')"
      :subtitle="t('settings.billingUi.planPageSubtitle')"
    />

    <div v-if="loading" class="text-sm text-fg-muted">{{ t('app.loading') }}</div>
    <template v-else>
      <Card v-if="subscription" class="shadow-sm">
        <template #title>{{ t('settings.billingUi.planCurrent') }}</template>
        <template #content>
          <div class="flex flex-wrap gap-3 items-center">
            <Tag severity="info" :value="subscription.plan?.name ?? subscription.planTier" />
            <span class="text-sm text-fg-muted">
              {{
                t('settings.billingUi.planPeriod', {
                  date: formatDate(subscription.subscription.periodEnd),
                })
              }}
            </span>
          </div>
          <p class="text-sm text-fg-muted mt-2">
            {{ subscription.wallet.periodCredits.toLocaleString() }}
            {{ t('settings.billingUi.creditsPerMonth') }}
          </p>
        </template>
      </Card>

      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <PlanCard
          v-for="p in plans"
          :key="p.id"
          :plan="p"
          :current-tier="subscription?.planTier ?? PlanTier.FREE"
          :tier-order="tierOrder"
          :can-manage="canManage"
          :loading="actionLoading"
          @select="onSelectTier"
        />
      </div>

      <Card v-if="grants.length" class="shadow-sm">
        <template #title>{{ t('settings.billingUi.planGrantsTitle') }}</template>
        <template #content>
          <ul class="text-sm space-y-1 text-fg-muted">
            <li v-for="g in grants" :key="g.id">
              {{ formatDate(g.createdAt) }} — +{{ g.delta.toLocaleString() }}
            </li>
          </ul>
        </template>
      </Card>
    </template>

    <MockPaymentGatewayDialog
      :visible="payOpen"
      :title="t('settings.sections.plan')"
      :payment-methods="paymentMethods"
      :amount-hint="payAmountHint"
      :submitting="paySubmitting"
      @close="payOpen = false"
      @confirm="onPayConfirm"
    />
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import Tag from 'primevue/tag';
import ConfirmDialog from 'primevue/confirmdialog';
import PageHeader from '@/components/common/PageHeader.vue';
import PlanCard from '@/components/billing/PlanCard.vue';
import MockPaymentGatewayDialog from '@/components/billing/MockPaymentGatewayDialog.vue';
import {
  changePlan,
  listPaymentMethods,
  listPlans,
  listPlanGrantTransactions,
  getSubscription,
  addPaymentMethod,
  type BillingPlan,
  type BillingSubscriptionResponse,
} from '@/api/billing';
import { useAuthStore } from '@/stores/auth.store';
import { PlanTier } from '@tracker/shared';

const { t } = useI18n();
const confirm = useConfirm();
const toast = useToast();
const auth = useAuthStore();

const loading = ref(true);
const actionLoading = ref(false);
const paySubmitting = ref(false);
const plans = ref<BillingPlan[]>([]);
const subscription = ref<BillingSubscriptionResponse | null>(null);
const grants = ref<Array<{ id: string; createdAt: string; delta: number; reason: string }>>([]);
const paymentMethods = ref<Awaited<ReturnType<typeof listPaymentMethods>>>([]);

const payOpen = ref(false);
const payAmountHint = ref('');
const pendingTier = ref<PlanTier | null>(null);

const canManage = computed(() => (auth.user?.permissions ?? []).includes('billing:manage'));

function tierOrder(tier: PlanTier): number {
  switch (tier) {
    case 'free':
      return 0;
    case 'basic':
      return 1;
    case 'pro':
      return 2;
    default:
      return 0;
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

async function load() {
  loading.value = true;
  try {
    const [p, s, g, pm] = await Promise.all([
      listPlans(),
      getSubscription(),
      listPlanGrantTransactions(),
      listPaymentMethods(),
    ]);
    plans.value = p;
    subscription.value = s;
    grants.value = g;
    paymentMethods.value = pm;
  } catch {
    toast.add({ severity: 'error', summary: t('settings.billingUi.loadError'), life: 4000 });
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function onSelectTier(tier: PlanTier) {
  const sub = subscription.value;
  if (!sub) return;
  if (tier === sub.planTier) return;

  const target = plans.value.find((p) => p.tier === tier);
  if (!target) return;

  const down = tierOrder(tier) < tierOrder(sub.planTier);
  const needsPay = target.priceCents > 0;

  const run = async (paymentMethodId?: string) => {
    actionLoading.value = true;
    try {
      await changePlan({ planTier: tier, paymentMethodId });
      toast.add({ severity: 'success', summary: t('settings.orgSaved'), life: 3000 });
      await load();
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e ? (e as any).response?.data?.message : null;
      toast.add({
        severity: 'error',
        summary: msg || t('settings.orgSaveError'),
        life: 5000,
      });
    } finally {
      actionLoading.value = false;
    }
  };

  if (down) {
    confirm.require({
      header: t('settings.sections.plan'),
      message: t('settings.billingUi.planDowngradeConfirm'),
      acceptLabel: t('common.confirm'),
      rejectLabel: t('common.cancel'),
      accept: () => run(undefined),
    });
    return;
  }

  if (needsPay && canManage.value) {
    pendingTier.value = tier;
    const major = (target.priceCents / 100).toFixed(2);
    payAmountHint.value = t('settings.billingUi.amountForPlan', {
      amount: `${target.currency} ${major}`,
    });
    payOpen.value = true;
    return;
  }

  void run(undefined);
}

async function onPayConfirm(
  payload:
    | { type: 'existing'; paymentMethodId: string }
    | { type: 'new'; number: string; holderName: string; expMonth: number; expYear: number; cvv: string },
) {
  if (!pendingTier.value) return;
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
    await changePlan({ planTier: pendingTier.value, paymentMethodId: pmId });
    toast.add({ severity: 'success', summary: t('settings.orgSaved'), life: 3000 });
    payOpen.value = false;
    pendingTier.value = null;
    await load();
  } catch (e: unknown) {
    const msg = e && typeof e === 'object' && 'response' in e ? (e as any).response?.data?.message : null;
    toast.add({ severity: 'error', summary: msg || t('settings.orgSaveError'), life: 5000 });
  } finally {
    paySubmitting.value = false;
  }
}
</script>
