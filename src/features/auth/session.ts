import "server-only";
import { redirect } from "next/navigation";
import { createServerSupabase, hasSupabaseConfig } from "@/lib/supabase/server";
import { safeNext } from "./validation";
export async function requireUser(next = "/perfil") {
  if (!hasSupabaseConfig())
    redirect(`/login?next=${encodeURIComponent(safeNext(next))}`);
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user || !user.email_confirmed_at)
    redirect(`/login?next=${encodeURIComponent(safeNext(next))}`);
  return { supabase, user };
}
export async function requireAdmin() {
  const session = await requireUser("/admin/parceiros");
  const { data, error } = await session.supabase
    .from("platform_roles")
    .select("role")
    .eq("profile_id", session.user.id)
    .maybeSingle();
  if (error || data?.role !== "super_admin")
    redirect("/perfil?notice=sem-permissao");
  return session;
}
