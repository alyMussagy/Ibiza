"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, requireAdmin } from "@/features/auth/session";
import { partnerSchema, reviewSchema } from "./validation";
import type { FormState } from "@/features/auth/actions";
export async function submitPartner(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser("/business/candidatura");
  const p = partnerSchema.safeParse(Object.fromEntries(form));
  if (!p.success)
    return {
      error:
        "Revê os campos. A descrição deve ter entre 20 e 2000 caracteres e o telefone deve ser válido.",
    };
  const { error } = await supabase.rpc("submit_partner_application", {
    business_name: p.data.name,
    business_type: p.data.businessType,
    contact_email: p.data.email,
    phone_number: p.data.phone,
    business_location: p.data.location,
    business_description: p.data.description,
  });
  if (error)
    return {
      error:
        "Não foi possível enviar. Verifica se já tens uma candidatura em análise e tenta novamente mais tarde.",
    };
  revalidatePath("/business/painel");
  redirect("/business/painel");
}
export async function reviewPartner(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const p = reviewSchema.safeParse(Object.fromEntries(form));
  if (!p.success)
    return {
      error:
        "Selecciona uma decisão e regista uma justificação de pelo menos 5 caracteres.",
    };
  const { error } = await supabase.rpc("review_partner_application", {
    application_id: p.data.applicationId,
    decision: p.data.decision,
    reason: p.data.reason,
  });
  if (error)
    return {
      error:
        "Não foi possível decidir. A candidatura pode já ter sido revista, ou não tens permissão.",
    };
  revalidatePath("/admin/parceiros");
  revalidatePath("/business/painel");
  return {
    success: "Decisão registada com sucesso no histórico de auditoria.",
  };
}
