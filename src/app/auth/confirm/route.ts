import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, hasSupabaseConfig } from "@/lib/supabase/server";
import { appOrigin } from "@/features/auth/validation";
export async function GET(request: NextRequest) {
  const origin = appOrigin(),
    token_hash = request.nextUrl.searchParams.get("token_hash"),
    type = request.nextUrl.searchParams.get("type");
  if (
    hasSupabaseConfig() &&
    token_hash &&
    (type === "signup" || type === "recovery")
  ) {
    try {
      const supabase = await createServerSupabase(true);
      const { error } = await supabase.auth.verifyOtp({ token_hash, type });
      if (!error)
        return NextResponse.redirect(
          new URL(
            type === "recovery" ? "/actualizar-palavra-passe" : "/perfil",
            origin,
          ),
        );
    } catch {
      /* fail closed */
    }
  }
  return NextResponse.redirect(new URL("/login?notice=invalid-link", origin));
}
