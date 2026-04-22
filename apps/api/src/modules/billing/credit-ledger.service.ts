import { Injectable } from '@nestjs/common';
import { CreditTransactionReason } from '@tracker/shared';

/**
 * Central place for AI credit consumption. Assistant integration is deferred (flag / TODO).
 */
@Injectable()
export class CreditLedgerService {
  async consume(_params: {
    organizationId: string;
    userId: string;
    credits: number;
    reason: CreditTransactionReason;
    ref?: Record<string, unknown>;
  }): Promise<boolean> {
    // TODO: integrate with AssistantService — deduct from CreditWallet / CreditAllocation with row locks.
    return true;
  }
}
