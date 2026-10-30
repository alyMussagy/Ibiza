import { z } from "zod";
const configSchema = z.object({ url: z.url(), key: z.string().min(1) });
export function readSupabaseConfig(
  url: string | undefined,
  key: string | undefined,
) {
  const parsed = configSchema.safeParse({ url, key });
  if (!parsed.success)
    throw new Error(
      "Supabase não configurado. Define NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  return parsed.data;
}
