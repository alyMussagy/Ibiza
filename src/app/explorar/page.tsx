import Link from "next/link";
import { filterListings, categories } from "@/features/listings/catalog";
import { SearchForm } from "@/components/marketplace/search-form";
import { ListingCard } from "@/components/marketplace/listing-card";
export const metadata = { title: "Explorar" };
export default async function Explore({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string }>;
}) {
  const p = await searchParams;
  const q = typeof p.q === "string" ? p.q.slice(0, 100) : "";
  const category = categories.some((c) => c.slug === p.categoria)
    ? p.categoria
    : "";
  const listings = filterListings(q, category);
  return (
    <main id="main" className="shell category-page">
      <span className="eyebrow coral">A VIAGEM COMEÇA AQUI</span>
      <h1>Encontra o teu próximo lugar.</h1>
      <SearchForm key={`${q}:${category}`} query={q} category={category} />
      <p className="notice">
        {listings.length} resultados de demonstração · Sem disponibilidade
        comercial
      </p>
      {listings.length ? (
        <div className="listing-grid">
          {listings.map((l) => (
            <ListingCard key={l.slug} listing={l} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>Ainda não encontrámos esse lugar.</h2>
          <p>
            Experimenta Tofo, Barra ou Vilanculos, ou escolhe outra categoria.
          </p>
          <Link className="text-link" href="/explorar">
            Limpar pesquisa
          </Link>
        </div>
      )}
    </main>
  );
}
