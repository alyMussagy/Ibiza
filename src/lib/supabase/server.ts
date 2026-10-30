import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readSupabaseConfig } from "./config";
// Read-only Server Component client. Auth mutations/refresh belong to Phase 2.
export async function createReadOnlyClient() {
  const { url, key } = readSupabaseConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll() {
        throw new Error(
          "Alterações de sessão exigem um Route Handler com cookies graváveis (Fase 2).",
        );
      },
    },
  });
}
