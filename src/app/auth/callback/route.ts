import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, hasSupabaseConfig } from "@/lib/supabase/server";
import { safeNext, appOrigin } from "@/features/auth/validation";
export async function GET(request: NextRequest) {
  const origin = appOrigin(),
    code = request.nextUrl.searchParams.get("code");
  if (hasSupabaseConfig() && code) {
    try {
      const supabase = await createServerSupabase(true);
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error)
        return NextResponse.redirect(
          new URL(safeNext(request.nextUrl.searchParams.get("next")), origin),
        );
    } catch {
      /* fail closed */
    }
  }
  return NextResponse.redirect(new URL("/login?notice=invalid-link", origin));
}
