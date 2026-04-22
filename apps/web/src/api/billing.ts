import { apiClient } from './client';
import type { PlanTier } from '@tracker/shared';

export type BillingPlan = {
  id: string;
  tier: PlanTier;
  name: string;
  priceCents: number;
  currency: string;
  creditsPerMonth: number;
  maxUsers: number;
  features: string[];
};

export type BillingSubscriptionResponse = {
  planTier: PlanTier;
  subscription: {
    id: string;
    status: string;
    periodStart: string;
    periodEnd: string;
    cancelAtPeriodEnd: boolean;
    gateway: string;
  };
  plan: {
    tier: PlanTier;
    name: string;
    priceCents: number;
    currency: string;
    creditsPerMonth: number;
    maxUsers: number;
    features: string[];
  } | null;
  wallet: {
    balance: number;
    periodCredits: number;
    periodConsumed: number;
    periodResetAt: string | null;
  };
};

export type PaymentMethodDto = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  holderName: string;
  isDefault: boolean;
};

export type InvoiceDto = {
  id: string;
  number: string;
  status: string;
  issuedAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  amountCents: number;
  currency: string;
  itemsJson: Record<string, unknown> | null;
};

export type CreditWalletDto = {
  balance: number;
  periodCredits: number;
  periodConsumed: number;
  periodResetAt: string | null;
  available: number;
};

export type CreditAllocationDto = {
  userId: string;
  email: string;
  fullName: string;
  monthlyLimit: number | null;
  monthConsumed: number;
};

export type CreditTransactionDto = {
  id: string;
  createdAt: string;
  delta: number;
  reason: string;
  ref: Record<string, unknown> | null;
  userId: string | null;
};

export async function listPlans(): Promise<BillingPlan[]> {
  const { data } = await apiClient.get<BillingPlan[]>('/billing/plans');
  return data;
}

export async function getSubscription(): Promise<BillingSubscriptionResponse> {
  const { data } = await apiClient.get<BillingSubscriptionResponse>('/billing/subscription');
  return data;
}

export async function changePlan(body: { planTier: PlanTier; paymentMethodId?: string }): Promise<unknown> {
  const { data } = await apiClient.post('/billing/subscription', body);
  return data;
}

export async function listPaymentMethods(): Promise<PaymentMethodDto[]> {
  const { data } = await apiClient.get<PaymentMethodDto[]>('/billing/payment-methods');
  return data;
}

export async function addPaymentMethod(body: {
  number: string;
  holderName: string;
  expMonth: number;
  expYear: number;
  cvv: string;
}): Promise<PaymentMethodDto> {
  const { data } = await apiClient.post<PaymentMethodDto>('/billing/payment-methods', body);
  return data;
}

export async function deletePaymentMethod(id: string): Promise<void> {
  await apiClient.delete(`/billing/payment-methods/${id}`);
}

export async function setDefaultPaymentMethod(id: string): Promise<void> {
  await apiClient.patch(`/billing/payment-methods/${id}/default`);
}

export async function listInvoices(params?: { limit?: number; cursor?: string }): Promise<{
  items: InvoiceDto[];
  nextCursor: string | null;
}> {
  const { data } = await apiClient.get<{ items: InvoiceDto[]; nextCursor: string | null }>(
    '/billing/invoices',
    { params },
  );
  return data;
}

export async function getInvoice(id: string): Promise<InvoiceDto> {
  const { data } = await apiClient.get<InvoiceDto>(`/billing/invoices/${id}`);
  return data;
}

export async function getCreditWallet(): Promise<CreditWalletDto> {
  const { data } = await apiClient.get<CreditWalletDto>('/billing/credits/wallet');
  return data;
}

export async function listCreditAllocations(): Promise<CreditAllocationDto[]> {
  const { data } = await apiClient.get<CreditAllocationDto[]>('/billing/credits/allocations');
  return data;
}

export async function updateCreditAllocation(
  userId: string,
  body: { monthlyLimit: number | null },
): Promise<void> {
  await apiClient.patch(`/billing/credits/allocations/${userId}`, body);
}

export async function topUpCredits(body: { credits: number; paymentMethodId: string }): Promise<unknown> {
  const { data } = await apiClient.post('/billing/credits/topup', body);
  return data;
}

export async function listCreditTransactions(limit?: number): Promise<CreditTransactionDto[]> {
  const { data } = await apiClient.get<CreditTransactionDto[]>('/billing/credits/transactions', {
    params: { limit },
  });
  return data;
}

export async function listPlanGrantTransactions(): Promise<
  Array<{ id: string; createdAt: string; delta: number; reason: string; ref: Record<string, unknown> | null }>
> {
  const { data } = await apiClient.get('/billing/credits/plan-grants');
  return data;
}
