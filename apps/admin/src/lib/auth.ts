import "server-only";
import { redirect } from "next/navigation";
import { createServerSupabase, hasSupabaseConfig } from "@/lib/supabase/server";

export const adminRoutes = ["/", "/parceiros", "/anuncios", "/reservas", "/auditoria"] as const;

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
