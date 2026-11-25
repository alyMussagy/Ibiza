import Link from "next/link";
import { Heart, Compass, ArrowLeft, ArrowRight } from "lucide-react";
import { requireUser } from "@/features/auth/session";
import { OfferCard } from "@/components/marketplace/offer-card";
import { FavoriteButton } from "@/components/forms/favorite-button";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Os meus favoritos" };
export default async function Favorites({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const { supabase, user } = await requireUser("/favoritos");
  const p = await searchParams;
  const page =
    typeof p.pagina === "string" && /^\d{1,2}$/.test(p.pagina)
      ? Math.max(1, Math.min(42, Number(p.pagina)))
      : 1;
  const {
    data: marks,
    error,
    count,
  } = await supabase
    .from("favorites")
    .select("listing_id", { count: "exact" })
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .order("listing_id")
    .range((page - 1) * 12, page * 12 - 1);
  if (error) throw new Error("Não foi possível consultar os favoritos.");
  const { data: items, error: offerError } = marks?.length
    ? await supabase
        .from("listings")
        .select(
          "id,title,description,location,price_minor,price_unit,category,organizations!inner(approval),listing_photos(id,alt,position)",
        )
        .in(
          "id",
          marks.map((m) => m.listing_id),
        )
        .eq("status", "published")
        .eq("organizations.approval", "approved")
    : { data: [], error: null };
  if (offerError)
    throw new Error("Não foi possível consultar as ofertas guardadas.");
  const byId = new Map((items ?? []).map((i) => [i.id, i]));
  const pages = Math.max(1, Math.ceil((count ?? 0) / 12));
  return (
    <main id="main" className="shell category-page">
      <span className="eyebrow coral">GUARDADO PARA MAIS TARDE</span>
      <h1>Os teus favoritos.</h1>
      <p className="lead">Ideias que merecem uma próxima visita.</p>
      <div className="account-links">
        <Button asChild>
          <Link href="/ofertas">
            <Compass size={18} />
            Descobrir ofertas
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/perfil">
            <ArrowLeft size={18} />A minha conta
          </Link>
        </Button>
      </div>
      {marks?.length ? (
        <div className="info-grid">
          {marks.map((m) => {
            const item = byId.get(m.listing_id);
            return item ? (
              <OfferCard key={item.id} item={item} saved signedIn />
            ) : (
              <article key={m.listing_id}>
                <Heart size={28} aria-hidden="true" />
                <h2>Oferta indisponível</h2>
                <p>
                  Esta oferta já não está publicada. Podes retirá-la da tua
                  lista.
                </p>
                <FavoriteButton id={m.listing_id} saved />
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <Heart size={36} aria-hidden="true" />
          <h2>
            {page > 1
              ? "Não há favoritos nesta página."
              : "Os teus próximos planos começam aqui."}
          </h2>
          <p>
            Guarda ofertas no catálogo para as encontrares facilmente depois.
          </p>
        </div>
      )}
      <nav className="offer-pagination" aria-label="Páginas de favoritos">
        {page > 1 && (
          <Button asChild variant="outline">
            <Link href={`/favoritos?pagina=${page - 1}`}>
              <ArrowLeft size={18} />
              Anterior
            </Link>
          </Button>
        )}
        <span>
          Página {page} · {count ?? 0} favoritos
        </span>
        {page < pages && (
          <Button asChild variant="outline">
            <Link href={`/favoritos?pagina=${page + 1}`}>
              Seguinte
              <ArrowRight size={18} />
            </Link>
          </Button>
        )}
      </nav>
    </main>
  );
}
export const dynamic = "force-dynamic";
