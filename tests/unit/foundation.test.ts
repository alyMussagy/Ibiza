import { describe, it, expect } from "vitest";
import {
  filterListings,
  demoListings,
  categories,
} from "@/features/listings/catalog";
import { readSupabaseConfig } from "@/lib/supabase/config";
import { simulatePendingPayment } from "@/features/payments/development-simulator";
describe("Pesquisa editorial", () => {
  it("combina termo e categoria sem diferenças de acentos ou maiúsculas", () => {
    expect(filterListings("  VILÂNCULOS ", "experiencias")).toHaveLength(1);
    expect(filterListings("Tofo", "eventos")).toHaveLength(0);
  });
  it("devolve vazio para pesquisa desconhecida", () =>
    expect(filterListings("inexistente")).toEqual([]));
  it("representa as cinco categorias e mantém slugs únicos", () => {
    expect(new Set(demoListings.map((l) => l.slug)).size).toBe(
      demoListings.length,
    );
    for (const c of categories)
      expect(filterListings("", c.slug).length).toBeGreaterThan(0);
  });
});
describe("Configuração e fronteira de pagamentos", () => {
  it("falha explicitamente quando Supabase não está configurado", () =>
    expect(() => readSupabaseConfig(undefined, undefined)).toThrow(
      "Supabase não configurado",
    ));
  it("rejeita URL inválido", () =>
    expect(() => readSupabaseConfig("invalid", "key")).toThrow());
  it("simulador nunca confirma pagamento e recusa produção", () => {
    const input = {
      orderId: "sample",
      money: { amountMinor: 100, currency: "MZN" as const },
    };
    expect(simulatePendingPayment(input, "test").state).toBe("pending");
    expect(() => simulatePendingPayment(input, "production")).toThrow();
  });
  it("recusa valores fraccionários ou negativos", () => {
    for (const amountMinor of [-1, 0, 1.5])
      expect(() =>
        simulatePendingPayment(
          { orderId: "sample", money: { amountMinor, currency: "MZN" } },
          "test",
        ),
      ).toThrow();
  });
});
