import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/features/auth/session", () => ({ requireUser: m.requireUser }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
import { updateProfile } from "@/features/auth/profile-actions";
beforeEach(() => {
  vi.resetAllMocks();
  m.requireUser.mockResolvedValue({ supabase: { rpc: m.rpc } });
});
it("não permite guardar nome sem sessão", async () => {
  m.requireUser.mockRejectedValue(new Error("login"));
  await expect(updateProfile({}, new FormData())).rejects.toThrow("login");
  expect(m.rpc).not.toHaveBeenCalled();
});
it("valida nome e ignora identificadores e papéis enviados pelo cliente", async () => {
  const f = new FormData();
  f.set("name", " ");
  expect((await updateProfile({}, f)).error).toBeTruthy();
  expect(m.rpc).not.toHaveBeenCalled();
  f.set("name", "  Ibraimo  ");
  f.set("id", "outra-conta");
  f.set("role", "super_admin");
  m.rpc.mockResolvedValue({ error: null });
  expect((await updateProfile({}, f)).success).toBeTruthy();
  expect(m.rpc).toHaveBeenCalledWith("update_own_profile", {
    new_display_name: "Ibraimo",
  });
  expect(m.revalidatePath).toHaveBeenCalledWith("/perfil");
});
it("não declara sucesso quando a base recusa a alteração", async () => {
  const f = new FormData();
  f.set("name", "Ibraimo");
  m.rpc.mockResolvedValue({ error: { message: "rejected" } });
  expect((await updateProfile({}, f)).error).toBeTruthy();
  expect(m.revalidatePath).not.toHaveBeenCalled();
});
