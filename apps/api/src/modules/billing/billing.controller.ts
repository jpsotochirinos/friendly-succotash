import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PlanTier } from '@tracker/shared';

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('plans')
  @RequirePermissions('billing:read')
  async plans() {
    const rows = await this.billing.listPlans();
    return rows.map((p) => ({
      id: p.id,
      tier: p.tier,
      name: p.name,
      priceCents: p.priceCents,
      currency: p.currency,
      creditsPerMonth: p.creditsPerMonth,
      maxUsers: p.maxUsers,
      features: p.features ?? [],
    }));
  }

  @Get('subscription')
  @RequirePermissions('billing:read')
  async subscription(@CurrentUser() user: any) {
    return this.billing.getSubscription(user);
  }

  @Post('subscription')
  @RequirePermissions('billing:manage')
  async changeSubscription(
    @CurrentUser() user: any,
    @Body() body: { planTier: PlanTier; paymentMethodId?: string },
  ) {
    if (!body?.planTier) throw new BadRequestException('planTier required');
    return this.billing.changePlan(user, {
      planTier: body.planTier,
      paymentMethodId: body.paymentMethodId,
    });
  }

  @Get('payment-methods')
  @RequirePermissions('billing:read')
  async paymentMethods(@CurrentUser() user: any) {
    const list = await this.billing.listPaymentMethods(user);
    return list.map((pm) => ({
      id: pm.id,
      brand: pm.brand,
      last4: pm.last4,
      expMonth: pm.expMonth,
      expYear: pm.expYear,
      holderName: pm.holderName,
      isDefault: pm.isDefault,
    }));
  }

  @Post('payment-methods')
  @RequirePermissions('billing:manage')
  async addPaymentMethod(
    @CurrentUser() user: any,
    @Body()
    body: {
      number: string;
      holderName: string;
      expMonth: number;
      expYear: number;
      cvv: string;
    },
  ) {
    const pm = await this.billing.addPaymentMethod(user, body);
    return {
      id: pm.id,
      brand: pm.brand,
      last4: pm.last4,
      expMonth: pm.expMonth,
      expYear: pm.expYear,
      holderName: pm.holderName,
      isDefault: pm.isDefault,
    };
  }

  @Delete('payment-methods/:id')
  @RequirePermissions('billing:manage')
  async deletePaymentMethod(@CurrentUser() user: any, @Param('id') id: string) {
    await this.billing.deletePaymentMethod(user, id);
    return { ok: true };
  }

  @Patch('payment-methods/:id/default')
  @RequirePermissions('billing:manage')
  async setDefault(@CurrentUser() user: any, @Param('id') id: string) {
    await this.billing.setDefaultPaymentMethod(user, id);
    return { ok: true };
  }

  @Get('invoices')
  @RequirePermissions('billing:read')
  async invoices(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const r = await this.billing.listInvoices(user, {
      limit: limit ? parseInt(limit, 10) : undefined,
      cursor: cursor || undefined,
    });
    return {
      items: r.items.map((inv) => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        issuedAt: inv.issuedAt,
        periodStart: inv.periodStart,
        periodEnd: inv.periodEnd,
        amountCents: inv.amountCents,
        currency: inv.currency,
        itemsJson: inv.itemsJson,
      })),
      nextCursor: r.nextCursor,
    };
  }

  @Get('invoices/:id')
  @RequirePermissions('billing:read')
  async invoice(@CurrentUser() user: any, @Param('id') id: string) {
    const inv = await this.billing.getInvoice(user, id);
    return {
      id: inv.id,
      number: inv.number,
      status: inv.status,
      issuedAt: inv.issuedAt,
      periodStart: inv.periodStart,
      periodEnd: inv.periodEnd,
      amountCents: inv.amountCents,
      currency: inv.currency,
      itemsJson: inv.itemsJson,
    };
  }

  @Get('credits/wallet')
  @RequirePermissions('billing:read')
  async wallet(@CurrentUser() user: any) {
    return this.billing.getWallet(user);
  }

  @Get('credits/allocations')
  @RequirePermissions('billing:read')
  async allocations(@CurrentUser() user: any) {
    return this.billing.listAllocations(user);
  }

  @Patch('credits/allocations/:userId')
  @RequirePermissions('billing:manage')
  async patchAllocation(
    @CurrentUser() user: any,
    @Param('userId') userId: string,
    @Body() body: { monthlyLimit: number | null },
  ) {
    await this.billing.updateAllocation(user, userId, body);
    return { ok: true };
  }

  @Post('credits/topup')
  @RequirePermissions('billing:manage')
  async topup(
    @CurrentUser() user: any,
    @Body() body: { credits: number; paymentMethodId: string },
  ) {
    return this.billing.topUp(user, body);
  }

  @Get('credits/transactions')
  @RequirePermissions('billing:read')
  async creditTransactions(@CurrentUser() user: any, @Query('limit') limit?: string) {
    const rows = await this.billing.listCreditTransactions(user, {
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return rows.map((t) => ({
      id: t.id,
      createdAt: t.createdAt,
      delta: t.delta,
      reason: t.reason,
      ref: t.ref,
      userId: t.user?.id ?? null,
    }));
  }

  @Get('credits/plan-grants')
  @RequirePermissions('billing:read')
  async planGrants(@CurrentUser() user: any) {
    const rows = await this.billing.lastPlanGrantTransactions(user);
    return rows.map((t) => ({
      id: t.id,
      createdAt: t.createdAt,
      delta: t.delta,
      reason: t.reason,
      ref: t.ref,
    }));
  }
}
