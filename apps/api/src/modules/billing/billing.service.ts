import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  CreditAllocation,
  CreditTransaction,
  CreditWallet,
  Invoice,
  Organization,
  PaymentMethod,
  PlanCatalog,
  Subscription,
  User,
} from '@tracker/db';
import {
  CreditTransactionReason,
  InvoiceStatus,
  PlanTier,
  SubscriptionStatus,
} from '@tracker/shared';
import { MockPaymentGateway } from './gateway/mock-payment-gateway';

const TOPUP_CENTS_PER_CREDIT = 10;

function tierOrder(t: PlanTier): number {
  switch (t) {
    case PlanTier.FREE:
      return 0;
    case PlanTier.BASIC:
      return 1;
    case PlanTier.PRO:
      return 2;
    default:
      return 0;
  }
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

@Injectable()
export class BillingService {
  constructor(
    private readonly em: EntityManager,
    private readonly gateway: MockPaymentGateway,
  ) {}

  private async getOrg(orgId: string): Promise<Organization> {
    return this.em.findOneOrFail(Organization, { id: orgId }, { filters: false });
  }

  private async findCatalog(tier: PlanTier): Promise<PlanCatalog> {
    const row = await this.em.findOne(PlanCatalog, { tier, active: true });
    if (!row) throw new BadRequestException(`Plan not found: ${tier}`);
    return row;
  }

  async ensureBillingState(orgId: string): Promise<{
    org: Organization;
    catalog: PlanCatalog;
    wallet: CreditWallet;
    subscription: Subscription;
  }> {
    const org = await this.getOrg(orgId);
    const catalog = await this.findCatalog(org.planTier);

    let wallet = await this.em.findOne(CreditWallet, { organization: orgId });
    const now = new Date();
    if (!wallet) {
      wallet = this.em.create(CreditWallet, {
        organization: org,
        balance: 0,
        periodCredits: catalog.creditsPerMonth,
        periodConsumed: 0,
        periodResetAt: endOfMonth(now),
      });
      this.em.persist(wallet);
      this.em.persist(
        this.em.create(CreditTransaction, {
          organization: org,
          user: null,
          delta: catalog.creditsPerMonth,
          reason: CreditTransactionReason.GRANT_MONTHLY,
          ref: { note: 'initial_period_grant' },
        }),
      );
    }

    let subscription = await this.em.findOne(Subscription, { organization: orgId });
    if (!subscription) {
      subscription = this.em.create(Subscription, {
        organization: org,
        planCatalog: catalog,
        status: SubscriptionStatus.ACTIVE,
        periodStart: startOfMonth(now),
        periodEnd: endOfMonth(now),
        cancelAtPeriodEnd: false,
        gateway: 'mock',
        gatewayRef: null,
      });
      this.em.persist(subscription);
    }

    await this.flushPeriodReset(orgId, org, wallet, catalog);

    const users = await this.em.find(User, { organization: orgId });
    for (const u of users) {
      let a = await this.em.findOne(CreditAllocation, { organization: orgId, user: u });
      if (!a) {
        a = this.em.create(CreditAllocation, {
          organization: org,
          user: u,
          monthlyLimit: null,
          monthConsumed: 0,
          periodResetAt: wallet.periodResetAt ?? endOfMonth(now),
        });
        this.em.persist(a);
      }
    }

    await this.em.flush();
    return { org, catalog, wallet, subscription };
  }

  private async flushPeriodReset(
    orgId: string,
    org: Organization,
    wallet: CreditWallet,
    catalog: PlanCatalog,
  ): Promise<void> {
    const now = new Date();
    if (!wallet.periodResetAt || now <= wallet.periodResetAt) return;

    wallet.periodConsumed = 0;
    wallet.periodCredits = catalog.creditsPerMonth;
    wallet.periodResetAt = endOfMonth(now);

    const allocs = await this.em.find(CreditAllocation, { organization: orgId });
    for (const a of allocs) {
      a.monthConsumed = 0;
      a.periodResetAt = wallet.periodResetAt;
    }

    this.em.persist(
      this.em.create(CreditTransaction, {
        organization: org,
        user: null,
        delta: catalog.creditsPerMonth,
        reason: CreditTransactionReason.GRANT_MONTHLY,
        ref: { note: 'monthly_reset' },
      }),
    );
  }

  async listPlans(): Promise<PlanCatalog[]> {
    return this.em.find(PlanCatalog, { active: true }, { orderBy: { priceCents: 'ASC' } });
  }

  async getSubscription(user: { organizationId: string }): Promise<Record<string, unknown>> {
    const { org, catalog, wallet, subscription } = await this.ensureBillingState(user.organizationId);
    await this.em.populate(subscription, ['planCatalog']);
    const pm = (subscription.planCatalog as PlanCatalog) ?? catalog;
    return {
      planTier: org.planTier,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        periodStart: subscription.periodStart,
        periodEnd: subscription.periodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        gateway: subscription.gateway,
      },
      plan: pm
        ? {
            tier: pm.tier,
            name: pm.name,
            priceCents: pm.priceCents,
            currency: pm.currency,
            creditsPerMonth: pm.creditsPerMonth,
            maxUsers: pm.maxUsers,
            features: pm.features ?? [],
          }
        : null,
      wallet: {
        balance: wallet.balance,
        periodCredits: wallet.periodCredits,
        periodConsumed: wallet.periodConsumed,
        periodResetAt: wallet.periodResetAt,
      },
    };
  }

  async changePlan(
    user: { organizationId: string; id: string },
    body: { planTier: PlanTier; paymentMethodId?: string },
  ): Promise<Record<string, unknown>> {
    const { org, catalog: oldCat, wallet, subscription } = await this.ensureBillingState(
      user.organizationId,
    );
    const targetTier = body.planTier;
    if (targetTier === org.planTier) {
      return this.getSubscription(user);
    }

    const newCat = await this.findCatalog(targetTier);
    const oldTier = org.planTier;
    const amountCents = newCat.priceCents;

    let chargeRef: string | null = null;
    if (amountCents > 0) {
      if (!body.paymentMethodId) {
        throw new BadRequestException('paymentMethodId is required for paid plans');
      }
      const pm = await this.em.findOne(PaymentMethod, {
        id: body.paymentMethodId,
        organization: user.organizationId,
      });
      if (!pm) throw new NotFoundException('Payment method not found');

      const charge = await this.gateway.charge({
        amountCents,
        currency: newCat.currency,
        paymentMethodGatewayRef: pm.gatewayRef,
        description: `Plan ${newCat.tier}`,
      });
      if (!charge.success) {
        throw new BadRequestException(charge.declineReason || 'Payment failed');
      }
      chargeRef = charge.gatewayRef;
    }

    org.planTier = targetTier;
    subscription.planCatalog = newCat;
    subscription.gatewayRef = chargeRef;
    subscription.periodStart = startOfMonth(new Date());
    subscription.periodEnd = endOfMonth(new Date());

    const deltaMonthly = newCat.creditsPerMonth - oldCat.creditsPerMonth;
    wallet.periodCredits = newCat.creditsPerMonth;
    wallet.periodConsumed = 0;
    if (deltaMonthly > 0) {
      wallet.balance += deltaMonthly;
    }
    wallet.periodResetAt = endOfMonth(new Date());

    const inv = this.em.create(Invoice, {
      organization: org,
      number: `INV-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase(),
      status: InvoiceStatus.PAID,
      issuedAt: new Date(),
      periodStart: subscription.periodStart,
      periodEnd: subscription.periodEnd,
      amountCents: amountCents,
      currency: newCat.currency,
      paymentMethod: body.paymentMethodId
        ? await this.em.findOne(PaymentMethod, { id: body.paymentMethodId! })
        : null,
      itemsJson: {
        type: 'plan_change',
        fromTier: oldTier,
        toTier: targetTier,
        chargeRef,
      },
    });
    this.em.persist(inv);

    this.em.persist(
      this.em.create(CreditTransaction, {
        organization: org,
        user: null,
        delta: deltaMonthly,
        reason: CreditTransactionReason.ADJUST,
        ref: { kind: 'plan_change', fromTier: oldTier, toTier: targetTier },
      }),
    );

    await this.em.flush();
    return {
      ok: true,
      planTier: org.planTier,
      subscription: await this.getSubscription(user),
    };
  }

  async listPaymentMethods(user: { organizationId: string }): Promise<PaymentMethod[]> {
    await this.ensureBillingState(user.organizationId);
    return this.em.find(PaymentMethod, { organization: user.organizationId }, { orderBy: { isDefault: 'DESC' } });
  }

  async addPaymentMethod(
    user: { organizationId: string },
    body: {
      number: string;
      holderName: string;
      expMonth: number;
      expYear: number;
      cvv: string;
    },
  ): Promise<PaymentMethod> {
    const { org } = await this.ensureBillingState(user.organizationId);
    let token;
    try {
      token = await this.gateway.tokenizeCard({
        number: body.number,
        holderName: body.holderName,
        expMonth: body.expMonth,
        expYear: body.expYear,
        cvv: body.cvv,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Tokenize failed';
      throw new BadRequestException(msg);
    }

    const existing = await this.em.count(PaymentMethod, { organization: user.organizationId });
    const pm = this.em.create(PaymentMethod, {
      organization: org,
      brand: token.brand,
      last4: token.last4,
      expMonth: body.expMonth,
      expYear: body.expYear,
      holderName: body.holderName,
      isDefault: existing === 0,
      gateway: 'mock',
      gatewayRef: token.gatewayRef,
    });
    this.em.persist(pm);
    await this.em.flush();
    return pm;
  }

  async deletePaymentMethod(user: { organizationId: string }, id: string): Promise<void> {
    const pm = await this.em.findOne(PaymentMethod, { id, organization: user.organizationId });
    if (!pm) throw new NotFoundException('Payment method not found');
    const wasDefault = pm.isDefault;
    this.em.remove(pm);
    await this.em.flush();
    if (wasDefault) {
      const next = await this.em.findOne(PaymentMethod, { organization: user.organizationId });
      if (next) {
        next.isDefault = true;
        await this.em.flush();
      }
    }
  }

  async setDefaultPaymentMethod(user: { organizationId: string }, id: string): Promise<void> {
    const pm = await this.em.findOne(PaymentMethod, { id, organization: user.organizationId });
    if (!pm) throw new NotFoundException('Payment method not found');
    const all = await this.em.find(PaymentMethod, { organization: user.organizationId });
    for (const p of all) p.isDefault = p.id === id;
    await this.em.flush();
  }

  async listInvoices(
    user: { organizationId: string },
    opts: { limit?: number; cursor?: string },
  ): Promise<{ items: Invoice[]; nextCursor: string | null }> {
    await this.ensureBillingState(user.organizationId);
    const limit = Math.min(opts.limit ?? 20, 100);
    const rows = await this.em.find(
      Invoice,
      { organization: user.organizationId },
      { orderBy: { issuedAt: 'DESC', id: 'DESC' }, limit: limit + 1 },
    );
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    const nextCursor =
      hasMore && last ? `${last.issuedAt.toISOString()}::${last.id}` : null;
    return { items, nextCursor };
  }

  async getInvoice(user: { organizationId: string }, id: string): Promise<Invoice> {
    const inv = await this.em.findOne(Invoice, { id, organization: user.organizationId });
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  async getWallet(user: { organizationId: string }): Promise<Record<string, unknown>> {
    const { org, catalog, wallet } = await this.ensureBillingState(user.organizationId);
    await this.flushPeriodReset(user.organizationId, org, wallet, catalog);
    await this.em.flush();
    const w = await this.em.findOneOrFail(CreditWallet, { organization: user.organizationId });
    const available = Math.max(0, w.periodCredits - w.periodConsumed) + w.balance;
    return {
      balance: w.balance,
      periodCredits: w.periodCredits,
      periodConsumed: w.periodConsumed,
      periodResetAt: w.periodResetAt,
      available,
    };
  }

  async listAllocations(user: { organizationId: string }): Promise<
    Array<{
      userId: string;
      email: string;
      fullName: string;
      monthlyLimit: number | null;
      monthConsumed: number;
    }>
  > {
    await this.ensureBillingState(user.organizationId);
    const users = await this.em.find(User, { organization: user.organizationId }, { populate: ['role'] as any });
    const out: Array<{
      userId: string;
      email: string;
      fullName: string;
      monthlyLimit: number | null;
      monthConsumed: number;
    }> = [];
    for (const u of users) {
      let a = await this.em.findOne(CreditAllocation, { organization: user.organizationId, user: u });
      if (!a) {
        const { org } = await this.ensureBillingState(user.organizationId);
        const wallet = await this.em.findOneOrFail(CreditWallet, { organization: user.organizationId });
        a = this.em.create(CreditAllocation, {
          organization: org,
          user: u,
          monthlyLimit: null,
          monthConsumed: 0,
          periodResetAt: wallet.periodResetAt,
        });
        this.em.persist(a);
        await this.em.flush();
      }
      out.push({
        userId: u.id,
        email: u.email,
        fullName: u.getFullName(),
        monthlyLimit: a.monthlyLimit ?? null,
        monthConsumed: a.monthConsumed,
      });
    }
    return out;
  }

  async updateAllocation(
    user: { organizationId: string; id: string },
    targetUserId: string,
    body: { monthlyLimit: number | null },
  ): Promise<void> {
    const target = await this.em.findOne(User, { id: targetUserId, organization: user.organizationId });
    if (!target) throw new NotFoundException('User not found');
    if (body.monthlyLimit !== null && body.monthlyLimit < 0) {
      throw new BadRequestException('monthlyLimit must be >= 0 or null');
    }
    await this.ensureBillingState(user.organizationId);
    let a = await this.em.findOne(CreditAllocation, { organization: user.organizationId, user: target });
    const org = await this.getOrg(user.organizationId);
    const wallet = await this.em.findOneOrFail(CreditWallet, { organization: user.organizationId });
    if (!a) {
      a = this.em.create(CreditAllocation, {
        organization: org,
        user: target,
        monthlyLimit: body.monthlyLimit,
        monthConsumed: 0,
        periodResetAt: wallet.periodResetAt,
      });
      this.em.persist(a);
    } else {
      a.monthlyLimit = body.monthlyLimit;
    }
    await this.em.flush();
  }

  async topUp(
    user: { organizationId: string },
    body: { credits: number; paymentMethodId: string },
  ): Promise<Record<string, unknown>> {
    if (!body.credits || body.credits < 1 || body.credits > 1_000_000) {
      throw new BadRequestException('Invalid credits amount');
    }
    const { org, wallet } = await this.ensureBillingState(user.organizationId);
    const pm = await this.em.findOne(PaymentMethod, {
      id: body.paymentMethodId,
      organization: user.organizationId,
    });
    if (!pm) throw new NotFoundException('Payment method not found');

    const amountCents = body.credits * TOPUP_CENTS_PER_CREDIT;
    const charge = await this.gateway.charge({
      amountCents,
      currency: 'PEN',
      paymentMethodGatewayRef: pm.gatewayRef,
      description: `Top-up ${body.credits} AI credits`,
    });
    if (!charge.success) {
      throw new BadRequestException(charge.declineReason || 'Payment failed');
    }

    wallet.balance += body.credits;
    this.em.persist(
      this.em.create(CreditTransaction, {
        organization: org,
        user: null,
        delta: body.credits,
        reason: CreditTransactionReason.TOPUP,
        ref: { gatewayRef: charge.gatewayRef, cents: amountCents },
      }),
    );

    const inv = this.em.create(Invoice, {
      organization: org,
      number: `TOP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase(),
      status: InvoiceStatus.PAID,
      issuedAt: new Date(),
      periodStart: null,
      periodEnd: null,
      amountCents,
      currency: 'PEN',
      paymentMethod: pm,
      itemsJson: { type: 'topup', credits: body.credits },
    });
    this.em.persist(inv);
    await this.em.flush();

    return { ok: true, creditsAdded: body.credits, wallet: await this.getWallet(user) };
  }

  async listCreditTransactions(
    user: { organizationId: string },
    opts: { limit?: number },
  ): Promise<CreditTransaction[]> {
    await this.ensureBillingState(user.organizationId);
    const limit = Math.min(opts.limit ?? 20, 100);
    return this.em.find(
      CreditTransaction,
      { organization: user.organizationId },
      { orderBy: { createdAt: 'DESC' }, limit, populate: ['user'] as any },
    );
  }

  async lastPlanGrantTransactions(user: { organizationId: string }): Promise<CreditTransaction[]> {
    await this.ensureBillingState(user.organizationId);
    return this.em.find(
      CreditTransaction,
      {
        organization: user.organizationId,
        reason: CreditTransactionReason.GRANT_MONTHLY,
      },
      { orderBy: { createdAt: 'DESC' }, limit: 3 },
    );
  }
}
