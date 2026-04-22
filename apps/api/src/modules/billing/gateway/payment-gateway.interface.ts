export type TokenizeCardInput = {
  number: string;
  holderName: string;
  expMonth: number;
  expYear: number;
  cvv: string;
};

export type TokenizeCardResult = {
  gatewayRef: string;
  last4: string;
  brand: string;
};

export type ChargeInput = {
  amountCents: number;
  currency: string;
  paymentMethodGatewayRef: string;
  description?: string;
};

export type ChargeResult = {
  success: boolean;
  gatewayRef: string;
  declineReason?: string;
};

export interface PaymentGateway {
  tokenizeCard(input: TokenizeCardInput): Promise<TokenizeCardResult>;
  charge(input: ChargeInput): Promise<ChargeResult>;
}
