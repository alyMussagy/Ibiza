import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, hasSupabaseConfig } from "@/lib/supabase/server";
import { adminNext, adminOAuthNextCookie, adminOrigin } from "@admin/lib/auth";

export async function GET(request: NextRequest) {
  const origin = adminOrigin();
  const next = adminNext(request.cookies.get(adminOAuthNextCookie)?.value);
  const code = request.nextUrl.searchParams.get("code");
  let notice = request.nextUrl.searchParams.has("error") ? "google-cancelled" : "invalid-link";

  if (hasSupabaseConfig() && code) {
    try {
      const supabase = await createServerSupabase(true);
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.user?.email_confirmed_at) {
        const { data: role, error: roleError } = await supabase
          .from("platform_roles")
          .select("role")
          .eq("profile_id", data.user.id)
          .maybeSingle();
        if (!roleError && role?.role === "super_admin") {
          const response = NextResponse.redirect(new URL(next, origin));
          response.cookies.set(adminOAuthNextCookie, "", { path: "/auth/callback", maxAge: 0 });
          return response;
        }
        await supabase.auth.signOut();
        notice = "no-access";
      }
    } catch {
      // Fail closed and let the user try again.
    }
  }

  const response = NextResponse.redirect(new URL(`/login?notice=${notice}`, origin));
  response.cookies.set(adminOAuthNextCookie, "", { path: "/auth/callback", maxAge: 0 });
  return response;
}
