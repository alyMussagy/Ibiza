import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { demoListings } from "@/features/listings/catalog";
import { ShareButton } from "@/components/marketplace/share-button";
export function generateStaticParams() {
  return demoListings.map((l) => ({ slug: l.slug }));
}
export default async function Detail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const l = demoListings.find((x) => x.slug === slug);
  if (!l) notFound();
  return (
    <main id="main" className="shell category-page">
      <Link href={`/${l.category}`} className="text-link">
        ← Voltar ao catálogo
      </Link>
      <p className="eyebrow coral">{l.location}</p>
      <h1>{l.title}</h1>
      <div className="detail-photo">
        <Image
          src={l.image}
          alt="Fotografia ilustrativa de demonstração"
          fill
          priority
          sizes="100vw"
        />
      </div>
      <div className="detail-copy">
        <span className="demo-pill static">Demonstração</span>
        <p className="lead">{l.description}</p>
        <p>
          As reservas e compras serão disponibilizadas numa fase futura, após
          aprovação dos parceiros e integração dos serviços.
        </p>
        <ShareButton />
      </div>
    </main>
  );
}
