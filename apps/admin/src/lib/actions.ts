"use server";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { loginSchema } from "@/features/auth/validation";
import { adminNext } from "./auth";

export async function signInAdmin(
  _previous: { error?: string },
  form: FormData,
): Promise<{ error?: string }> {
  const parsed = loginSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) return { error: "Confere o email e a palavra-passe." };
  const supabase = await createServerSupabase(true);
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user?.email_confirmed_at)
    return { error: "Não foi possível entrar. Confere os dados e a confirmação do email." };
  const { data: role, error: roleError } = await supabase
    .from("platform_roles")
    .select("role")
    .eq("profile_id", data.user.id)
    .maybeSingle();
  if (roleError || role?.role !== "super_admin") {
    await supabase.auth.signOut();
    return { error: "Esta conta não tem acesso à administração do IBIZA." };
  }
  redirect(adminNext(form.get("next")));
}

export async function signOutAdmin() {
  const supabase = await createServerSupabase(true);
  await supabase.auth.signOut();
  redirect("/login");
}
