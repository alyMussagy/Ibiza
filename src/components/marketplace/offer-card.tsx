import Image from "next/image";
import Link from "next/link";
import { MapPin, Store, ArrowUpRight, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "@/components/forms/favorite-button";
import { categories } from "@/features/listings/catalog";
export type OfferCardData = {
  id: string;
  title: string;
  description: string;
  location: string;
  price_minor: number;
  price_unit: string;
  category: string;
  listing_photos: { id: string; alt: string; position: number }[];
};
export function OfferCard({
  item,
  saved = false,
  signedIn = false,
}: {
  item: OfferCardData;
  saved?: boolean;
  signedIn?: boolean;
}) {
  const cover = [...item.listing_photos].sort(
    (a, b) => a.position - b.position,
  )[0];
  return (
    <article className="offer-card">
      {cover ? (
        <Image
          className="offer-cover"
          src={`/media/${cover.id}`}
          alt={cover.alt}
          width={640}
          height={420}
          unoptimized
        />
      ) : (
        <div className="offer-cover-placeholder">
          <Store size={36} aria-hidden="true" />
          <span>Fotografias em breve</span>
        </div>
      )}
      <span className="status-badge">
        {categories.find((c) => c.slug === item.category)?.label ??
          item.category}
      </span>
      <h2>{item.title}</h2>
      <p>
        <MapPin size={16} aria-hidden="true" /> {item.location}
      </p>
      <p>
        {item.description.slice(0, 180)}
        {item.description.length > 180 ? "…" : ""}
      </p>
      <strong>
        {(item.price_minor / 100).toLocaleString("pt-MZ")} MZN /{" "}
        {item.price_unit}
      </strong>
      <div className="offer-card-actions">
        <Button asChild>
          <Link href={`/ofertas/${item.id}`}>
            Conhecer a oferta
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </Button>
        {signedIn ? (
          <FavoriteButton id={item.id} saved={saved} />
        ) : (
          <Button asChild variant="outline">
            <Link href="/login?next=/ofertas">
              <Heart size={18} aria-hidden="true" />
              Entrar para guardar
            </Link>
          </Button>
        )}
      </div>
    </article>
  );
}
