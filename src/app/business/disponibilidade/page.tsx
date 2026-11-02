import { StayInventoryForm } from "@/components/forms/stay-forms";
import Link from "next/link";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import { requireUser } from "@/features/auth/session";
import {
  AvailabilityForm,
  ClosePeriodForm,
} from "@/components/forms/reservation-forms";
import { formatPeriod } from "@/features/reservations/validation";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Disponibilidade" };
export default async function Availability() {
  const { supabase, user } = await requireUser("/business/disponibilidade");
  const { data: members, error: memberError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .in("role", ["owner", "manager"]);
  if (memberError) throw new Error("Não foi possível consultar os negócios.");
  const ids = (members ?? []).map((m) => m.organization_id);
  const { data: listings, error } = ids.length
    ? await supabase
        .from("listings")
        .select("id,title,category,organizations!inner(approval)")
        .in("organization_id", ids)
        .eq("organizations.approval", "approved")
        .neq("category", "destinos")
        .neq("status", "archived")
        .order("title")
        .limit(100)
    : { data: [], error: null };
  if (error) throw new Error("Não foi possível consultar as ofertas.");
  const { data: slots, error: slotError } = listings?.length
    ? await supabase
        .from("availability_slots")
        .select("*")
        .in(
          "listing_id",
          listings.map((l) => l.id),
        )
        .gte("ends_at", new Date().toISOString())
        .order("starts_at")
        .limit(200)
    : { data: [], error: null };
  if (slotError)
    throw new Error("Não foi possível consultar a disponibilidade.");
  const { data: nights, error: nightError } = listings?.some(
    (l) => l.category === "estadias",
  )
    ? await supabase
        .from("stay_nights")
        .select("listing_id,night,capacity,price_minor")
        .in(
          "listing_id",
          listings.filter((l) => l.category === "estadias").map((l) => l.id),
        )
        .gte("night", new Date(Date.now() + 7200000).toISOString().slice(0, 10))
        .order("night")
        .limit(365)
    : { data: [], error: null };
  if (nightError) throw new Error("Não foi possível consultar as noites.");
  const names = new Map((listings ?? []).map((l) => [l.id, l.title]));
  return (
    <main id="main" className="shell category-page">
      <span className="eyebrow coral">PLANEIA A TUA OPERAÇÃO</span>
      <h1>Datas e vagas.</h1>
      <p className="lead">
        Gere períodos, categorias de bilhetes e inventário por noite.
      </p>
      <Button asChild variant="outline">
        <Link href="/business/reservas">
          <ArrowLeft size={18} />
          Ver reservas
        </Link>
      </Button>
      {listings?.length ? (
        <section className="account-card">
          {listings.some(
            (l) => !["eventos", "estadias"].includes(l.category),
          ) && (
            <>
              <h2>
                <CalendarPlus size={24} /> Novo período
              </h2>
              <AvailabilityForm
                listings={listings.filter(
                  (l) => l.category !== "eventos" && l.category !== "estadias",
                )}
              />
            </>
          )}
          {!!listings.some((l) => l.category === "eventos") && (
            <>
              <h2>Categorias de bilhetes</h2>
              <AvailabilityForm
                event
                listings={listings.filter((l) => l.category === "eventos")}
              />
            </>
          )}
        </section>
      ) : (
        <div className="empty-state">
          <h2>Prepara primeiro uma oferta.</h2>
          <p>
            A disponibilidade exige uma oferta de um negócio aprovado. Destinos
            editoriais não recebem reservas.
          </p>
          <Button asChild>
            <Link href="/business/anuncios">
              <CalendarPlus size={18} />
              Gerir ofertas
            </Link>
          </Button>
        </div>
      )}
      {!!listings?.some((l) => l.category === "estadias") && (
        <section className="account-card">
          <h2>Inventário de alojamentos</h2>
          <StayInventoryForm
            listings={listings.filter((l) => l.category === "estadias")}
          />
        </section>
      )}
      {!!nights?.length && (
        <details className="account-card">
          <summary>Noites configuradas · até 365 registos</summary>
          {nights.map((n) => (
            <p key={n.listing_id + n.night}>
              <strong>{names.get(n.listing_id)}</strong> · {n.night} ·{" "}
              {n.capacity} unidades ·{" "}
              {(n.price_minor / 100).toLocaleString("pt-MZ")} MZN/noite
            </p>
          ))}
        </details>
      )}
      <h2>Próximos períodos</h2>
      <p>
        Até 200 períodos futuros. A capacidade configurada inclui vagas já
        ocupadas; acompanha os pedidos na área de reservas.
      </p>
      <div className="info-grid">
        {slots?.map((s) => (
          <article key={s.id}>
            <h3>{names.get(s.listing_id)}</h3>
            <span className="status-badge">
              {s.active ? "Aberto" : "Fechado para novos pedidos"}
            </span>
            <p>
              {formatPeriod(s.starts_at)} → {formatPeriod(s.ends_at)}
            </p>
            <p>Capacidade configurada: {s.capacity} unidades</p>
            <p>
              {(s.price_minor / 100).toLocaleString("pt-MZ")} MZN por unidade /
              período
            </p>
            {s.active && <ClosePeriodForm id={s.id} />}
          </article>
        ))}
      </div>
    </main>
  );
}
export const dynamic = "force-dynamic";
