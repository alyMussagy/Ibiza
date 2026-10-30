"use client";
import { createBrowserClient } from "@supabase/ssr";
import { readSupabaseConfig } from "./config";
export function createClient() {
  const { url, key } = readSupabaseConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  return createBrowserClient(url, key);
}
