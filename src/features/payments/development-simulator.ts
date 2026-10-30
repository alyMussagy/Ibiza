import type { Money, Payment } from "./contracts";
// Stateless test fixture, never a persistence layer or usable payment provider.
export function simulatePendingPayment(
  input: { orderId: string; money: Money },
  environment = process.env.NODE_ENV,
): Payment {
  if (environment !== "development" && environment !== "test")
    throw new Error("Simulador bloqueado fora de desenvolvimento/testes.");
  if (
    !Number.isSafeInteger(input.money.amountMinor) ||
    input.money.amountMinor <= 0 ||
    input.money.currency !== "MZN"
  )
    throw new Error("Valor inválido.");
  return {
    id: `demo_${input.orderId}`,
    orderId: input.orderId,
    money: { ...input.money },
    state: "pending",
  };
}
