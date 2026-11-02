"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/session";
import type { FormState } from "@/features/auth/actions";
export async function changePartnerStatus(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin("/admin/parceiros");
  const p = z
    .object({
      id: z.uuid(),
      activate: z.enum(["true", "false"]),
      reason: z.string().trim().min(5).max(1000),
    })
    .safeParse(Object.fromEntries(form));
  if (!p.success) return { error: "Indica um motivo com 5 a 1000 caracteres." };
  const { error } = await supabase.rpc("set_partner_active", {
    target_org: p.data.id,
    activate: p.data.activate === "true",
    reason: p.data.reason,
  });
  if (error)
    return {
      error:
        "Não foi possível alterar. Confirma o estado actual; não podes decidir sobre o teu próprio negócio.",
    };
  revalidatePath("/admin/parceiros");
  revalidatePath("/ofertas");
  return { success: "Estado actualizado e motivo registado na auditoria." };
}
