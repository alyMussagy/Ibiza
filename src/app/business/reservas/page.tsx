import Link from "next/link";
import { CalendarDays, ArrowLeft, CalendarPlus } from "lucide-react";
import { requireUser } from "@/features/auth/session";
import { ReservationCard } from "@/components/marketplace/reservation-card";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Reservas do negócio" };
export default async function BusinessReservations() {
  const { supabase, user } = await requireUser("/business/reservas");
  const { data: members, error: memberError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .in("role", ["owner", "manager"]);
  if (memberError) throw new Error("Não foi possível consultar os negócios.");
  const ids = (members ?? []).map((m) => m.organization_id);
  const { data, error } = ids.length
    ? await supabase
        .from("reservations")
        .select("*")
        .in("organization_id", ids)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [], error: null };
  if (error) throw new Error("Não foi possível consultar os pedidos.");
  return (
    <main id="main" className="shell category-page">
      <span className="eyebrow coral">IBIZA BUSINESS</span>
      <h1>Reservas do teu negócio.</h1>
      <p className="lead">
        Responde aos pedidos dentro do prazo e acompanha os serviços
        confirmados.
      </p>
      <div className="account-links">
        <Button asChild variant="outline">
          <Link href="/business/painel">
            <ArrowLeft size={18} />
            Área do parceiro
          </Link>
        </Button>
        <Button asChild>
          <Link href="/business/disponibilidade">
            <CalendarPlus size={18} />
            Gerir disponibilidade
          </Link>
        </Button>
      </div>
      <p className="notice">
        Até 100 reservas recentes. Pedidos sem resposta expiram após 24 horas ou
        no início do período. Não existe cobrança online nesta versão.
      </p>
      {data?.length ? (
        <div className="info-grid">
          {data.map((item) => (
            <ReservationCard key={item.id} item={item} manager />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <CalendarDays size={36} />
          <h2>Os teus pedidos vão aparecer aqui.</h2>
          <p>
            Publica uma oferta aprovada e define períodos disponíveis para
            receber reservas.
          </p>
        </div>
      )}
    </main>
  );
}
export const dynamic = "force-dynamic";
