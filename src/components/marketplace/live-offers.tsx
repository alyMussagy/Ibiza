import Link from "next/link";
import { Store, ArrowUpRight } from "lucide-react";
import { createServerSupabase, hasSupabaseConfig } from "@/lib/supabase/server";
import { OfferCard } from "./offer-card";
import { Button } from "@/components/ui/button";
export async function LiveOffers({
  category,
  limit = 6,
}: {
  category?: string;
  limit?: number;
}) {
  if (!hasSupabaseConfig())
    return <p className="notice">O catálogo está a ser preparado.</p>;
  const db = await createServerSupabase();
  let query = db
    .from("listings")
    .select(
      "id,title,description,location,price_minor,price_unit,category,organizations!inner(approval),listing_photos(id,alt,position)",
    )
    .eq("status", "published")
    .eq("organizations.approval", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (category) query = query.eq("category", category);
  const { data, error } = await query;
  if (error)
    return (
      <p role="status" className="notice">
        Não conseguimos carregar as ofertas. Tenta novamente dentro de
        instantes.
      </p>
    );
  if (!data?.length)
    return (
      <div className="empty-state">
        <Store size={32} />
        <h3>Novas ofertas a caminho.</h3>
        <p>Os anúncios dos parceiros aparecem aqui depois de aprovados.</p>
        <Button asChild variant="outline">
          <Link href="/ofertas">
            <ArrowUpRight size={18} />
            Explorar o catálogo
          </Link>
        </Button>
      </div>
    );
  const { data: identity } = await db.auth.getUser();
  const user = identity.user;
  const signedIn = !!user?.email_confirmed_at;
  let saved = new Set<string>();
  if (signedIn) {
    const favorites = await db
      .from("favorites")
      .select("listing_id")
      .eq("profile_id", user.id)
      .in(
        "listing_id",
        data.map((item) => item.id),
      );
    if (favorites.error)
      throw new Error("Não foi possível consultar os favoritos.");
    saved = new Set(favorites.data.map((item) => item.listing_id));
  }
  return (
    <div className="listing-grid">
      {data.map((item) => (
        <OfferCard
          key={item.id}
          item={item}
          signedIn={signedIn}
          saved={saved.has(item.id)}
        />
      ))}
    </div>
  );
}
