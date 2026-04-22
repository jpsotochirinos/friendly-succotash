import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
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
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { CreditLedgerService } from './credit-ledger.service';
import { MockPaymentGateway } from './gateway/mock-payment-gateway';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      PlanCatalog,
      Subscription,
      PaymentMethod,
      Invoice,
      CreditWallet,
      CreditAllocation,
      CreditTransaction,
      Organization,
      User,
    ]),
  ],
  controllers: [BillingController],
  providers: [BillingService, CreditLedgerService, MockPaymentGateway],
  exports: [BillingService, CreditLedgerService],
})
export class BillingModule {}
