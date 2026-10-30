import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { DemoListing } from "@/features/listings/catalog";
export function ListingCard({ listing }: { listing: DemoListing }) {
  return (
    <Card className="listing-card">
      <Link href={`/descobrir/${listing.slug}`}>
        <div className="card-image">
          <Image
            src={listing.image}
            alt={`Imagem ilustrativa: ${listing.tag}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 33vw"
          />
          <span className="demo-pill">Demonstração</span>
        </div>
        <div className="card-body">
          <span className="eyebrow">{listing.tag}</span>
          <h3>
            {listing.title}
            <ArrowUpRight size={19} />
          </h3>
          <p>
            <MapPin size={14} />
            {listing.location}
          </p>
        </div>
      </Link>
    </Card>
  );
}
