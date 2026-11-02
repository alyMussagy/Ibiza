import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowLeft, MapPin, Store } from "lucide-react";
import { createServerSupabase, hasSupabaseConfig } from "@/lib/supabase/server";
import { PhotoGallery } from "@/components/marketplace/photo-gallery";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Oferta do parceiro" };
export default async function OfferDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success || !hasSupabaseConfig()) notFound();
  const supabase = await createServerSupabase();
  const { data: item, error } = await supabase
    .from("listings")
    .select(
      "id,title,description,location,price_minor,price_unit,category,organizations!inner(name,approval),listing_photos(id,alt,position)",
    )
    .eq("id", id)
    .eq("status", "published")
    .eq("organizations.approval", "approved")
    .maybeSingle();
  if (error) throw new Error("Não foi possível consultar esta oferta.");
  if (!item) notFound();
  const org = Array.isArray(item.organizations)
    ? item.organizations[0]
    : item.organizations;
  return (
    <main id="main" className="shell category-page">
      <Button asChild variant="outline">
        <Link href="/ofertas">
          <ArrowLeft size={18} />
          Todas as ofertas
        </Link>
      </Button>
      <span className="eyebrow coral">{item.category}</span>
      <h1>{item.title}</h1>
      <p className="lead">
        <MapPin size={20} aria-hidden="true" /> {item.location}
      </p>
      <PhotoGallery photos={item.listing_photos} />
      <div className="offer-details">
        <section>
          <h2>O que te espera</h2>
          <p className="offer-description">{item.description}</p>
          <p>
            <Store size={20} aria-hidden="true" /> Por {org?.name}
          </p>
        </section>
        <aside className="account-card">
          <span className="eyebrow">PREÇO DE REFERÊNCIA</span>
          <h2>{(item.price_minor / 100).toLocaleString("pt-MZ")} MZN</h2>
          <p>por {item.price_unit}</p>
          <p className="notice">
            Oferta informativa. Reservas e pagamentos ainda não estão
            disponíveis.
          </p>
        </aside>
      </div>
    </main>
  );
}
export const dynamic = "force-dynamic";
