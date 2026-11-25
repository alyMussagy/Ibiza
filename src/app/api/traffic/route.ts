import { NextRequest } from "next/server";
import { z } from "zod";
import { createServerSupabase, hasSupabaseConfig } from "@/lib/supabase/server";

const visitSchema = z.object({
  id: z.uuid(),
  source: z.string().trim().min(1).max(80),
  campaign: z.string().trim().max(100),
  landingPath: z.string().startsWith("/").max(160).refine((path) => !path.startsWith("//")),
});

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin ||
      !request.headers.get("content-type")?.startsWith("application/json"))
    return new Response(null, { status: 403 });

  const agent = request.headers.get("user-agent") || "";
  if (/bot|crawler|spider|slurp|preview/i.test(agent))
    return new Response(null, { status: 204 });

  const body = await request.json().catch(() => null);
  const parsed = visitSchema.safeParse(body);
  if (!parsed.success) return new Response(null, { status: 400 });
  if (!hasSupabaseConfig()) return new Response(null, { status: 503 });

  const device = /ipad|tablet/i.test(agent) ? "tablet" :
    /mobile|android|iphone/i.test(agent) ? "mobile" : "desktop";
  const rawCountry = request.headers.get("x-vercel-ip-country")?.toUpperCase() || "";
  const country = /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : null;
  const rawRegion = request.headers.get("x-vercel-ip-country-region")?.toUpperCase() || "";
  const region = country && /^[A-Z0-9]{1,3}$/.test(rawRegion) ? rawRegion : null;
  let city: string | null = null;
  if (country) {
    try {
      city = decodeURIComponent(request.headers.get("x-vercel-ip-city") || "")
        .replace(/[\p{Cc}\p{Cf}]/gu, "").trim().slice(0, 80) || null;
    } catch {
      city = null;
    }
  }
  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.rpc("record_traffic_session", {
      p_session_id: parsed.data.id,
      p_source: parsed.data.source,
      p_campaign: parsed.data.campaign || null,
      p_device: device,
      p_landing_path: parsed.data.landingPath,
      p_country_code: country,
      p_region_code: region,
      p_city: city,
    });
    if (!error) return new Response(null, { status: 204 });
  } catch {
    // Traffic measurement must never block the public site.
  }
  return new Response(null, { status: 503 });
}
