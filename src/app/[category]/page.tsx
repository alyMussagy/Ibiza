import { notFound } from "next/navigation";
import { categories } from "@/features/listings/catalog";
import { LiveOffers } from "@/components/marketplace/live-offers";
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
      <LiveOffers category={c.slug} limit={12} />
    </main>
  );
}
