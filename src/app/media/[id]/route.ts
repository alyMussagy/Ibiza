import { createServerSupabase } from "@/lib/supabase/server";
import { z } from "zod";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (!z.uuid().safeParse(id).success)
    return new Response(null, { status: 404, headers });
  const supabase = await createServerSupabase();
  const { data: photo, error } = await supabase
    .from("listing_photos")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (error) return new Response(null, { status: 503, headers });
  if (!photo) return new Response(null, { status: 404, headers });
  const { data, error: downloadError } = await supabase.storage
    .from("listing-photos")
    .download(photo.storage_path);
  if (downloadError || !data)
    return new Response(null, { status: 404, headers });
  const ext = photo.storage_path.split(".").pop();
  const mime =
    ext === "jpg"
      ? "image/jpeg"
      : ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : null;
  if (!mime) return new Response(null, { status: 404, headers });
  return new Response(data, {
    headers: {
      ...headers,
      "Content-Type": mime,
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
export const dynamic = "force-dynamic";
