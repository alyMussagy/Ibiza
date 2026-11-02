"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/session";
import type { FormState } from "@/features/auth/actions";
export async function setFavorite(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser("/favoritos");
  const p = z
    .object({ listingId: z.uuid(), desired: z.enum(["true", "false"]) })
    .safeParse(Object.fromEntries(form));
  if (!p.success) return { error: "Não foi possível identificar a oferta." };
  const { error } = await supabase.rpc("set_listing_favorite", {
    target_listing: p.data.listingId,
    desired: p.data.desired === "true",
  });
  if (error)
    return {
      error:
        "Não foi possível actualizar os favoritos. A oferta pode já não estar disponível ou atingiste o limite de 500.",
    };
  revalidatePath("/favoritos");
  revalidatePath("/ofertas");
  revalidatePath(`/ofertas/${p.data.listingId}`);
  return {
    success:
      p.data.desired === "true"
        ? "Oferta guardada nos favoritos."
        : "Oferta retirada dos favoritos.",
  };
}
