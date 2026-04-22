import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type {
  ChargeInput,
  ChargeResult,
  PaymentGateway,
  TokenizeCardInput,
  TokenizeCardResult,
} from './payment-gateway.interface';

const DECLINE_LAST4 = '0002';

function stripDigits(s: string): string {
  return s.replace(/\D/g, '');
}

function luhnCheck(num: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num[i]!, 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function cardBrand(digits: string): string {
  if (digits.startsWith('4')) return 'visa';
  if (/^5[1-5]/.test(digits)) return 'mastercard';
  if (digits.startsWith('34') || digits.startsWith('37')) return 'amex';
  return 'card';
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

@Injectable()
export class MockPaymentGateway implements PaymentGateway {
  async tokenizeCard(input: TokenizeCardInput): Promise<TokenizeCardResult> {
    const digits = stripDigits(input.number);
    if (digits.length < 13 || digits.length > 19 || !luhnCheck(digits)) {
      throw new Error('Invalid card number');
    }
    await sleep(800 + Math.floor(Math.random() * 700));
    const last4 = digits.slice(-4);
    if (last4 === DECLINE_LAST4) {
      throw new Error('Card declined (mock)');
    }
    return {
      gatewayRef: `mock_pm_${randomBytes(12).toString('hex')}`,
      last4,
      brand: cardBrand(digits),
    };
  }

  async charge(input: ChargeInput): Promise<ChargeResult> {
    await sleep(900 + Math.floor(Math.random() * 600));
    if (input.amountCents <= 0) {
      return { success: true, gatewayRef: `mock_ch_${randomBytes(8).toString('hex')}` };
    }
    if (!input.paymentMethodGatewayRef?.startsWith('mock_pm_')) {
      return { success: false, gatewayRef: '', declineReason: 'Invalid payment method' };
    }
    return {
      success: true,
      gatewayRef: `mock_ch_${randomBytes(10).toString('hex')}`,
    };
  }
}
