import { notFound } from "next/navigation";
import { categories, filterListings } from "@/features/listings/catalog";
import { ListingCard } from "@/components/marketplace/listing-card";
import { SearchForm } from "@/components/marketplace/search-form";
export function generateStaticParams() {
  return categories.map((c) => ({ category: c.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  return {
    title:
      categories.find((c) => c.slug === category)?.label ??
      "Página não encontrada",
  };
}
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const c = categories.find((c) => c.slug === category);
  if (!c) notFound();
  return (
    <main id="main" className="shell category-page">
      <span className="eyebrow coral">DESCOBRE INHAMBANE</span>
      <h1>{c.label}</h1>
      <p className="lead">{c.description}</p>
      <SearchForm category={c.slug} />
      <p className="notice">
        Catálogo demonstrativo. Os exemplos e fotografias são ilustrativos; não
        aceitamos reservas nesta fase.
      </p>
      <div className="listing-grid">
        {filterListings("", c.slug).map((l) => (
          <ListingCard key={l.slug} listing={l} />
        ))}
      </div>
    </main>
  );
}
