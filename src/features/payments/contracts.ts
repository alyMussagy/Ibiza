// Minor units only. MZN 1.00 = 100 centavos. No floating point amounts.
export type Money = { amountMinor: number; currency: "MZN" };
export type PaymentState = "pending" | "confirmed" | "failed" | "refunded";
export type Payment = {
  id: string;
  orderId: string;
  money: Money;
  state: PaymentState;
};
export interface PaymentProvider {
  createIntent(input: {
    orderId: string;
    money: Money;
    idempotencyKey: string;
  }): Promise<Payment>;
  getPayment(id: string): Promise<Payment>;
  verifyWebhook(input: {
    rawBody: string;
    signature: string;
  }): Promise<{ eventId: string; payment: Payment }>;
  refund(input: {
    paymentId: string;
    money: Money;
    idempotencyKey: string;
  }): Promise<{ id: string; state: "pending" | "confirmed" }>;
  getSettlement(
    id: string,
  ): Promise<{ id: string; state: "pending" | "settled" | "failed" }>;
  requestTransfer?(input: {
    organizationId: string;
    money: Money;
    idempotencyKey: string;
  }): Promise<{ id: string }>;
}
