"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, requireAdmin } from "@/features/auth/session";
import type { FormState } from "@/features/auth/actions";
import { listingSchema, listingReviewSchema } from "./validation";
export async function saveListing(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser("/business/anuncios");
  const p = listingSchema.safeParse(Object.fromEntries(form));
  if (!p.success)
    return {
      error:
        "Revê os campos, a descrição (mínimo 30 caracteres) e o preço em MZN.",
    };
  const v = p.data;
  const { error } = await supabase.rpc("save_listing", {
    listing_id: v.id || null,
    org_id: v.organizationId,
    expected_revision: v.revision,
    listing_title: v.title,
    listing_description: v.description,
    listing_category: v.category,
    listing_location: v.location,
    amount_minor: v.price,
    unit: v.unit,
    submit_review: v.intent === "submit",
  });
  if (error)
    return {
      error:
        "Não foi possível guardar. Confirma a aprovação do negócio e actualiza a página se o anúncio foi alterado.",
    };
  revalidatePath("/business/anuncios");
  revalidatePath("/admin/anuncios");
  revalidatePath("/ofertas");
  redirect("/business/anuncios?guardado=1");
}
export async function reviewListing(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const p = listingReviewSchema.safeParse(Object.fromEntries(form));
  if (!p.success)
    return {
      error: "Escolhe a decisão e justifica com pelo menos 5 caracteres.",
    };
  const { error } = await supabase.rpc("review_listing", {
    listing_id: p.data.id,
    expected_revision: p.data.revision,
    decision: p.data.decision,
    reason: p.data.reason,
  });
  if (error)
    return {
      error:
        "Não foi possível decidir. O anúncio pode ter mudado, já ter sido revisto ou pertencer ao teu negócio. Actualiza a página.",
    };
  revalidatePath("/business/anuncios");
  revalidatePath("/admin/anuncios");
  revalidatePath("/ofertas");
  return { success: "Decisão guardada e registada na auditoria." };
}
