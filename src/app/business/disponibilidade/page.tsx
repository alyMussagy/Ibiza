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
        .select("id,title,organizations!inner(approval)")
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
  const names = new Map((listings ?? []).map((l) => [l.id, l.title]));
  return (
    <main id="main" className="shell category-page">
      <span className="eyebrow coral">PLANEIA A TUA OPERAÇÃO</span>
      <h1>Datas e vagas.</h1>
      <p className="lead">
        Define períodos fechados e o preço por unidade para cada oferta.
      </p>
      <Button asChild variant="outline">
        <Link href="/business/reservas">
          <ArrowLeft size={18} />
          Ver reservas
        </Link>
      </Button>
      {listings?.length ? (
        <section className="account-card">
          <h2>
            <CalendarPlus size={24} /> Novo período
          </h2>
          <AvailabilityForm listings={listings} />
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
