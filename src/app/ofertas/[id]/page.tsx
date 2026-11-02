import { randomUUID } from "node:crypto";
import { ReservationRequestForm } from "@/components/forms/reservation-forms";
import { FavoriteButton } from "@/components/forms/favorite-button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowLeft, MapPin, Store, Heart } from "lucide-react";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const favorite = user
    ? await supabase
        .from("favorites")
        .select("listing_id")
        .eq("profile_id", user.id)
        .eq("listing_id", id)
        .maybeSingle()
    : { data: null, error: null };
  if (favorite.error)
    throw new Error("Não foi possível consultar os favoritos.");
  const availability = await supabase.rpc("available_periods", {
    target_listing: id,
  });
  if (availability.error && availability.error.code !== "PGRST202")
    throw new Error("Não foi possível consultar a disponibilidade.");
  const periods = availability.data ?? [];
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
      {user?.email_confirmed_at ? (
        <FavoriteButton id={id} saved={!!favorite.data} />
      ) : (
        <Button asChild variant="outline">
          <Link href="/login?next=/ofertas">
            <Heart size={18} aria-hidden="true" />
            Entrar para guardar
          </Link>
        </Button>
      )}
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
            O preço dos períodos disponíveis pode variar. O total exacto aparece
            antes do envio do pedido. Sem pagamento online.
          </p>
          <h3>Escolhe quando queres ir</h3>
          {periods.length ? (
            user?.email_confirmed_at ? (
              <ReservationRequestForm
                periods={periods}
                requestKey={randomUUID()}
              />
            ) : (
              <Button asChild>
                <Link href="/login?next=/ofertas">
                  Entrar para pedir reserva
                </Link>
              </Button>
            )
          ) : (
            <p>Ainda não há períodos disponíveis para esta oferta.</p>
          )}
        </aside>
      </div>
    </main>
  );
}
export const dynamic = "force-dynamic";
