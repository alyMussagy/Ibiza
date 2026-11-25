import Link from "next/link";
import { ArrowUpRight, BedDouble, Compass, Music2, Utensils, Waves } from "lucide-react";
import { categories } from "@/features/listings/catalog";

const icons = [Compass, BedDouble, Music2, Utensils, Waves];

export function CategoryRail({ current }: { current?: string }) {
  return <nav className="shell ibiza-category-rail" aria-label="Explorar por categoria">
    <div className="ibiza-category-rail-heading">
      <span>ESCOLHE O TEU RITMO</span>
      <p>Uma viagem, muitas formas de a viver.</p>
    </div>
    <div className="ibiza-category-rail-track">
      {categories.map((category, index) => {
        const Icon = icons[index];
        return <Link href={`/${category.slug}`} key={category.slug} aria-current={current === category.slug ? "page" : undefined}>
          <span className="ibiza-category-art" aria-hidden="true"><Icon size={32} strokeWidth={1.7} /></span>
          <span className="ibiza-category-copy"><strong>{category.label}</strong><small>{category.short}</small></span>
          <ArrowUpRight className="ibiza-category-arrow" size={18} aria-hidden="true" />
        </Link>;
      })}
    </div>
  </nav>;
}
