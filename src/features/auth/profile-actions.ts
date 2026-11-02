"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/session";
import type { FormState } from "./actions";
export async function updateProfile(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser("/perfil");
  const name = z.string().trim().min(2).max(100).safeParse(form.get("name"));
  if (!name.success) return { error: "Usa um nome entre 2 e 100 caracteres." };
  try {
    const { error } = await supabase.rpc("update_own_profile", {
      new_display_name: name.data,
    });
    if (error)
      return { error: "Não foi possível guardar o nome. Tenta novamente." };
  } catch {
    return { error: "Não foi possível ligar ao serviço. Tenta novamente." };
  }
  revalidatePath("/perfil");
  return { success: "Nome actualizado com sucesso." };
}
