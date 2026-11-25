import "server-only";
import { redirect } from "next/navigation";
import { createServerSupabase, hasSupabaseConfig } from "@/lib/supabase/server";

export const adminRoutes = ["/", "/parceiros", "/anuncios", "/reservas", "/auditoria"] as const;
export const adminOAuthNextCookie = "ibiza_admin_oauth_next";

export function adminOrigin() {
  const value = process.env.NEXT_PUBLIC_ADMIN_APP_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://ibiza-admin-blue.vercel.app"
      : "http://127.0.0.1:3001");
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
    throw new Error("Origem administrativa inválida.");
  return url.origin;
}

export function adminNext(value: unknown) {
  return typeof value === "string" && adminRoutes.includes(value as (typeof adminRoutes)[number])
    ? value
    : "/";
}

export async function requireAdmin(next = "/") {
  if (!hasSupabaseConfig()) redirect(`/login?next=${encodeURIComponent(adminNext(next))}`);
  const supabase = await createServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.email_confirmed_at)
    redirect(`/login?next=${encodeURIComponent(adminNext(next))}`);
  const { data: role, error: roleError } = await supabase
    .from("platform_roles")
    .select("role")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (roleError || role?.role !== "super_admin") redirect("/sem-acesso");
  return { supabase, user };
}
