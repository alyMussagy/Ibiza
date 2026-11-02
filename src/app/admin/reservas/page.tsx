import Link from "next/link";
import { Search, RotateCcw, CalendarDays } from "lucide-react";
import { requireAdmin } from "@/features/auth/session";
import { AdminNav, AdminPagination } from "@/components/admin/navigation";
import { ReservationCard } from "@/components/marketplace/reservation-card";
import { Button } from "@/components/ui/button";
import {
  adminPage,
  adminSearch,
  adminDate,
  afterDate,
  adminHref,
} from "@/features/admin/filters";
import { reservationLabels } from "@/features/reservations/validation";
export const metadata = { title: "Todas as reservas" };
export default async function AdminReservations({
  searchParams,
}: {
  searchParams: Promise<{
    pagina?: string;
    estado?: string;
    q?: string;
    de?: string;
    ate?: string;
  }>;
}) {
  const { supabase } = await requireAdmin("/admin/reservas");
  const p = await searchParams;
  const page = adminPage(p.pagina),
    q = adminSearch(p.q),
    from = adminDate(p.de),
    to = adminDate(p.ate),
    status = Object.hasOwn(reservationLabels, p.estado ?? "") ? p.estado! : "";
  const now = new Date().toISOString();
  let query = supabase.from("reservations").select("*", { count: "exact" });
  if (status === "expired")
    query = query.eq("status", "pending").lte("expires_at", now);
  else if (status) {
    query = query.eq("status", status);
    if (status === "pending") query = query.gt("expires_at", now);
  }
  if (q)
    query = query.or(`listing_title.ilike.%${q}%,customer_name.ilike.%${q}%`);
  if (from) query = query.gte("starts_at", from + "T00:00:00+02:00");
  if (to) query = query.lt("starts_at", afterDate(to));
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * 20, page * 20 - 1);
  if (error) throw new Error("Não foi possível consultar as reservas.");
  return (
    <main id="main" className="shell category-page">
      <span className="eyebrow coral">ACOMPANHAMENTO OPERACIONAL</span>
      <h1>Reservas da plataforma.</h1>
      <p className="lead">Consulta pedidos, datas e decisões dos parceiros.</p>
      <AdminNav current="/admin/reservas" />
      <form action="/admin/reservas" method="get" className="offer-filters">
        <label>
          Oferta ou nome do cliente
          <input name="q" defaultValue={q} maxLength={80} />
        </label>
        <label>
          Estado
          <select name="estado" defaultValue={status}>
            <option value="">Todos</option>
            {Object.entries(reservationLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Início da reserva desde
          <input type="date" name="de" defaultValue={from} />
        </label>
        <label>
          Início da reserva até
          <input type="date" name="ate" defaultValue={to} />
        </label>
        <Button>
          <Search size={18} />
          Filtrar reservas
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/reservas">
            <RotateCcw size={18} />
            Limpar
          </Link>
        </Button>
      </form>
      <p className="notice">
        Consulta administrativa. As confirmações e cancelamentos são realizados
        pelo parceiro ou pelo cliente, conforme as permissões. Os valores
        apresentados não comprovam pagamento.
      </p>
      {data?.length ? (
        <div className="info-grid">
          {data.map((item) => (
            <ReservationCard item={item} key={item.id} readOnly />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <CalendarDays size={36} />
          <h2>Nenhuma reserva encontrada.</h2>
          <p>Os pedidos que correspondem aos filtros aparecerão aqui.</p>
        </div>
      )}
      <AdminPagination
        page={page}
        count={count ?? 0}
        href={(n) =>
          adminHref(
            "/admin/reservas",
            { q, estado: status, de: from, ate: to },
            n,
          )
        }
      />
    </main>
  );
}
export const dynamic = "force-dynamic";
