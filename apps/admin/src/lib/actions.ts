"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabase, hasSupabaseConfig } from "@/lib/supabase/server";
import { loginSchema } from "@/features/auth/validation";
import { adminNext, adminOAuthNextCookie, adminOrigin } from "./auth";

export async function googleSignInAdmin(form: FormData) {
  if (!hasSupabaseConfig()) redirect("/login?notice=google-unavailable");
  let authUrl: string | undefined;
  try {
    const supabase = await createServerSupabase(true);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${adminOrigin()}/auth/callback` },
    });
    if (!error && data.url) {
      (await cookies()).set(adminOAuthNextCookie, adminNext(form.get("next")), {
        httpOnly: true,
        sameSite: "lax",
        secure: new URL(adminOrigin()).protocol === "https:",
        path: "/auth/callback",
        maxAge: 600,
      });
      authUrl = data.url;
    }
  } catch {
    // Show a safe message on the login page.
  }
  if (authUrl) redirect(authUrl);
  redirect("/login?notice=google-unavailable");
}

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
