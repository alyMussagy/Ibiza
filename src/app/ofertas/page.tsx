import Link from "next/link";
import {
  Store,
  Compass,
  Search,
  ArrowLeft,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react";
import { createServerSupabase, hasSupabaseConfig } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { OfferCard } from "@/components/marketplace/offer-card";
import { categories } from "@/features/listings/catalog";
import {
  offerFilters,
  offersHref,
  offerPageSize,
  type OfferParams,
} from "@/features/listings/filters";
export const metadata = { title: "Ofertas dos parceiros" };
export default async function Offers({
  searchParams,
}: {
  searchParams: Promise<OfferParams>;
}) {
  const f = offerFilters(await searchParams);
  const supabase = hasSupabaseConfig() ? await createServerSupabase() : null;
  let query = supabase
    ?.from("listings")
    .select(
      "id,title,description,location,price_minor,price_unit,category,organizations!inner(approval),listing_photos(id,alt,position)",
      { count: "exact" },
    )
    .eq("status", "published")
    .eq("organizations.approval", "approved");
  if (f.q) query = query?.or(`title.ilike.%${f.q}%,description.ilike.%${f.q}%`);
  if (f.category) query = query?.eq("category", f.category);
  if (f.location) query = query?.ilike("location", `%${f.location}%`);
  if (f.maximum !== null) query = query?.lte("price_minor", f.maximum);
  query =
    f.order === "recentes"
      ? query?.order("created_at", { ascending: false })
      : query?.order("price_minor", { ascending: f.order === "preco_asc" });
  const [result, auth] = await Promise.all([
    query
      ?.order("id")
      .range((f.page - 1) * offerPageSize, f.page * offerPageSize - 1) ??
      Promise.resolve({ data: [], error: null, count: 0 }),
    supabase?.auth.getUser() ?? Promise.resolve({ data: { user: null } }),
  ]);
  const { data: items, error, count } = result;
  if (error) throw new Error("Não foi possível consultar as ofertas.");
  const user = auth.data.user;
  let saved = new Set<string>();
  if (user && supabase && items?.length) {
    const favorites = await supabase
      .from("favorites")
      .select("listing_id")
      .eq("profile_id", user.id)
      .in(
        "listing_id",
        items.map((i) => i.id),
      );
    if (favorites.error)
      throw new Error("Não foi possível consultar os favoritos.");
    saved = new Set(favorites.data.map((i) => i.listing_id));
  }
  const pages = Math.max(1, Math.ceil((count ?? 0) / offerPageSize));
  const filtered = !!(f.q || f.category || f.location || f.maximum !== null);
  return (
    <main id="main" className="shell category-page">
      <span className="eyebrow coral">PARCEIROS IBIZA</span>
      <h1>Ofertas da nossa comunidade.</h1>
      <p className="lead">
        Encontra o teu próximo plano entre negócios aprovados.
      </p>
      <form method="get" className="offer-filters" action="/ofertas">
        <label>
          O que procuras?
          <input
            name="q"
            defaultValue={f.q}
            maxLength={80}
            placeholder="Passeio, jantar, estadia…"
          />
        </label>
        <label>
          Localização
          <input
            name="local"
            defaultValue={f.location}
            maxLength={80}
            placeholder="Tofo, Barra, Vilanculos…"
          />
        </label>
        <label>
          Categoria
          <select name="categoria" defaultValue={f.category}>
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Preço máximo (MZN)
          <input
            name="maximo"
            defaultValue={f.maximum === null ? "" : String(f.maximum / 100)}
            inputMode="decimal"
            pattern="[0-9]{1,7}([.,][0-9]{1,2})?"
            placeholder="Sem limite"
          />
        </label>
        <label>
          Ordenar
          <select name="ordem" defaultValue={f.order}>
            <option value="recentes">Mais recentes</option>
            <option value="preco_asc">Menor preço</option>
            <option value="preco_desc">Maior preço</option>
          </select>
        </label>
        <Button>
          <Search size={18} aria-hidden="true" />
          Pesquisar
        </Button>
      </form>
      <p className="notice">
        Preços de referência por pessoa, noite, entrada, mesa ou grupo, conforme
        cada oferta. Reservas e pagamentos ainda não disponíveis.
      </p>
      <p aria-live="polite">{count ?? 0} ofertas encontradas</p>
      {items?.length ? (
        <div className="info-grid">
          {items.map((i) => (
            <OfferCard
              key={i.id}
              item={i}
              signedIn={!!user?.email_confirmed_at}
              saved={saved.has(i.id)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Store size={36} aria-hidden="true" />
          <h2>
            {filtered || f.page > 1
              ? "Não encontrámos ofertas nesta pesquisa."
              : "As primeiras ofertas estão a caminho."}
          </h2>
          <p>
            {filtered
              ? "Experimenta outra localização ou ajusta o preço."
              : "Estamos a preparar o catálogo com os parceiros locais."}
          </p>
          {(filtered || f.page > 1) && (
            <Button asChild variant="outline">
              <Link href="/ofertas">
                <SlidersHorizontal size={18} />
                Limpar filtros
              </Link>
            </Button>
          )}
        </div>
      )}
      <nav className="offer-pagination" aria-label="Páginas de ofertas">
        {f.page > 1 && (
          <Button asChild variant="outline">
            <Link href={offersHref(f, f.page - 1)}>
              <ArrowLeft size={18} />
              Anterior
            </Link>
          </Button>
        )}
        <span>
          Página {f.page} · {pages}{" "}
          {pages === 1 ? "página disponível" : "páginas disponíveis"}
        </span>
        {f.page < pages && (
          <Button asChild variant="outline">
            <Link href={offersHref(f, f.page + 1)}>
              Seguinte
              <ArrowRight size={18} />
            </Link>
          </Button>
        )}
      </nav>
      <Button asChild variant="outline">
        <Link href="/explorar">
          <Compass size={18} />
          Explorar ideias de viagem
        </Link>
      </Button>
    </main>
  );
}
export const dynamic = "force-dynamic";
