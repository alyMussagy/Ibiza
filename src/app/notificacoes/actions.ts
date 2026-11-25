"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/features/auth/session";
export async function markRead(form: FormData) {
  const { supabase } = await requireUser("/notificacoes");
  const id = z.uuid().parse(form.get("id"));
  const { error } = await supabase.rpc("mark_notification_read", {
    target_id: id,
  });
  if (error) throw new Error("Não foi possível marcar o aviso como lido.");
  revalidatePath("/notificacoes");
}
