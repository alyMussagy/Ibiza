import { describe, it, expect, vi, beforeEach } from "vitest";
import { safeNext, registerSchema } from "@/features/auth/validation";
const mocks = vi.hoisted(() => ({
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    getUser: vi.fn(),
    updateUser: vi.fn(),
    signOut: vi.fn(),
  },
  configured: true,
}));
vi.mock("@/lib/supabase/server", () => ({
  hasSupabaseConfig: () => mocks.configured,
  createServerSupabase: async () => ({ auth: mocks.auth }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
import { authAction, logoutAction } from "@/features/auth/actions";
function form(mode: string, fields: Record<string, string> = {}) {
  const f = new FormData();
  f.set("mode", mode);
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.configured = true;
  process.env.NEXT_PUBLIC_APP_URL = "http://127.0.0.1:3000";
});
describe("Autenticação no servidor", () => {
  it("bloqueia destinos externos e palavras-passe fracas", () => {
    for (const value of [
      "//evil.test",
      "https://evil.test",
      "/\\evil.test",
      "/perfil?next=https://evil.test",
    ])
      expect(safeNext(value)).toBe("/perfil");
    expect(safeNext("/business/painel")).toBe("/business/painel");
    expect(
      registerSchema.safeParse({
        name: "Ana",
        email: "ana@example.test",
        password: "123",
      }).success,
    ).toBe(false);
  });
  it("não simula sucesso sem configuração", async () => {
    mocks.configured = false;
    expect((await authAction({}, form("login"))).error).toBeTruthy();
    expect(mocks.auth.signInWithPassword).not.toHaveBeenCalled();
  });
  it("login exige confirmação de email e não aceita retorno externo", async () => {
    mocks.auth.signInWithPassword.mockResolvedValue({
      data: { user: { email_confirmed_at: "now" } },
      error: null,
    });
    await expect(
      authAction(
        {},
        form("login", {
          email: "ana@example.test",
          password: "secret",
          next: "//evil.test",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/perfil");
    mocks.auth.signInWithPassword.mockResolvedValue({
      data: { user: { email_confirmed_at: null } },
      error: null,
    });
    expect(
      (
        await authAction(
          {},
          form("login", { email: "ana@example.test", password: "secret" }),
        )
      ).error,
    ).toBeTruthy();
  });
  it("registo envia só nome como metadata e confirmação para origem configurada", async () => {
    mocks.auth.signUp.mockResolvedValue({ error: null });
    expect(
      (
        await authAction(
          {},
          form("register", {
            name: "Ana",
            email: "ana@example.test",
            password: "a-long-password!",
            role: "super_admin",
          }),
        )
      ).success,
    ).toBeTruthy();
    expect(mocks.auth.signUp.mock.calls[0][0].options.data).toEqual({
      display_name: "Ana",
    });
    expect(mocks.auth.signUp.mock.calls[0][0].options.emailRedirectTo).toBe(
      "http://127.0.0.1:3000/auth/callback",
    );
  });
  it("recuperação apresenta confirmação neutra", async () => {
    mocks.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    expect(
      (await authAction({}, form("recover", { email: "absent@example.test" })))
        .success,
    ).toContain("Se existir");
  });
  it("alteração de palavra-passe verifica identidade e termina sessões", async () => {
    mocks.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(
      (await authAction({}, form("update", { password: "a-new-password!" })))
        .error,
    ).toBeTruthy();
    expect(mocks.auth.updateUser).not.toHaveBeenCalled();
    mocks.auth.getUser.mockResolvedValue({
      data: { user: { id: "user" } },
      error: null,
    });
    mocks.auth.updateUser.mockResolvedValue({ error: null });
    mocks.auth.signOut.mockResolvedValue({ error: null });
    await expect(
      authAction({}, form("update", { password: "a-new-password!" })),
    ).rejects.toThrow("REDIRECT:/login?changed=1");
    expect(mocks.auth.signOut).toHaveBeenCalledWith({ scope: "global" });
  });
  it("logout não declara sucesso se o serviço falhar", async () => {
    mocks.auth.signOut.mockResolvedValue({ error: { message: "unavailable" } });
    await expect(logoutAction()).rejects.toThrow(
      "REDIRECT:/perfil?notice=logout-failed",
    );
  });
});
