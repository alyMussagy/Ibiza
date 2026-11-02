import Image from "next/image";
import { ImageIcon } from "lucide-react";
export type ListingPhoto = { id: string; alt: string; position: number };
export function PhotoGallery({ photos }: { photos: ListingPhoto[] }) {
  return photos.length ? (
    <div className="offer-gallery">
      {[...photos]
        .sort((a, b) => a.position - b.position)
        .map((p) => (
          <figure key={p.id}>
            <Image
              src={`/media/${p.id}`}
              alt={p.alt}
              width={960}
              height={640}
              unoptimized
            />
            <figcaption>{p.alt}</figcaption>
          </figure>
        ))}
    </div>
  ) : (
    <div className="empty-state">
      <ImageIcon size={32} aria-hidden="true" />
      <p>Fotografias ainda não disponíveis.</p>
    </div>
  );
}
