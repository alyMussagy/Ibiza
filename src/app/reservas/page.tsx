import Link from "next/link";
import { CalendarDays, Compass, ArrowLeft } from "lucide-react";
import { requireUser } from "@/features/auth/session";
import { ReservationCard } from "@/components/marketplace/reservation-card";
import { Button } from "@/components/ui/button";
export const metadata = { title: "As minhas reservas" };
export default async function Reservations({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string }>;
}) {
  const { supabase, user } = await requireUser("/reservas");
  const p = await searchParams;
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Não foi possível consultar as reservas.");
  return (
    <main id="main" className="shell category-page">
      <span className="eyebrow coral">OS TEUS PRÓXIMOS PLANOS</span>
      <h1>As minhas reservas.</h1>
      <p className="lead">
        Acompanha pedidos, confirmações e o histórico das tuas experiências.
      </p>
      <div className="account-links">
        <Button asChild>
          <Link href="/ofertas">
            <Compass size={18} />
            Encontrar uma oferta
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/perfil">
            <ArrowLeft size={18} />A minha conta
          </Link>
        </Button>
      </div>
      {p.enviado === "1" && (
        <p className="form-success" role="status">
          Pedido enviado. Aguarda a confirmação do parceiro nesta página.
        </p>
      )}
      <p className="notice">
        Horário de Moçambique. Mostramos as 100 reservas mais recentes. Os
        pedidos expirados deixam de manter vagas automaticamente.
      </p>
      {data?.length ? (
        <div className="info-grid">
          {data.map((item) => (
            <ReservationCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <CalendarDays size={36} />
          <h2>A tua próxima viagem começa com uma escolha.</h2>
          <p>Consulta uma oferta publicada e escolhe um período disponível.</p>
        </div>
      )}
    </main>
  );
}
export const dynamic = "force-dynamic";
