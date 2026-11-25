import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, hasSupabaseConfig } from "@/lib/supabase/server";
import { safeNext, appOrigin, oauthNextCookie } from "@/features/auth/validation";
export async function GET(request: NextRequest) {
  const origin = appOrigin(),
    code = request.nextUrl.searchParams.get("code");
  const next = safeNext(
    request.nextUrl.searchParams.get("next") ??
      request.cookies.get(oauthNextCookie)?.value,
  );
  if (hasSupabaseConfig() && code) {
    try {
      const supabase = await createServerSupabase(true);
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const response = NextResponse.redirect(new URL(next, origin));
        response.cookies.set(oauthNextCookie, "", {
          path: "/auth/callback",
          maxAge: 0,
        });
        return response;
      }
    } catch {
      /* fail closed */
    }
  }
  const notice = request.nextUrl.searchParams.has("error")
    ? "google-cancelled"
    : "invalid-link";
  const response = NextResponse.redirect(
    new URL(`/login?notice=${notice}`, origin),
  );
  response.cookies.set(oauthNextCookie, "", {
    path: "/auth/callback",
    maxAge: 0,
  });
  return response;
}

