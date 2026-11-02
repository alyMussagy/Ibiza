import Link from "next/link";
import {
  Building2,
  Store,
  CalendarDays,
  Clock,
  ArrowUpRight,
  ClipboardCheck,
} from "lucide-react";
import { requireAdmin } from "@/features/auth/session";
import { AdminNav } from "@/components/admin/navigation";
import { Button } from "@/components/ui/button";
import { formatPeriod } from "@/features/reservations/validation";
import { auditLabels } from "@/features/admin/filters";
export const metadata = { title: "Administração IBIZA" };
export default async function AdminOverview() {
  const { supabase } = await requireAdmin("/admin");
  const now = new Date().toISOString();
  const today = new Date(Date.now() + 7200000).toISOString().slice(0, 10);
  const start = today + "T00:00:00+02:00";
  const end = new Date(Date.parse(start) + 86400000).toISOString();
  const results = await Promise.all([
    supabase
      .from("partner_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .eq("approval", "approved"),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("review_status", "pending"),
    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .gt("expires_at", now),
    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed")
      .gte("starts_at", start)
      .lt("starts_at", end),
    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed")
      .gt("ends_at", now),
    supabase
      .from("audit_logs")
      .select("id,action,created_at")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(6),
  ]);
  if (results.some((r) => r.error))
    throw new Error("Não foi possível carregar a visão geral da operação.");
  const metrics = [
    {
      label: "Candidaturas por rever",
      value: results[0].count ?? 0,
      Icon: Building2,
      href: "/admin/parceiros?estado=pending",
    },
    {
      label: "Parceiros aprovados",
      value: results[1].count ?? 0,
      Icon: ClipboardCheck,
      href: "/admin/parceiros?estado=approved",
    },
    {
      label: "Anúncios por rever",
      value: results[2].count ?? 0,
      Icon: Store,
      href: "/admin/anuncios",
    },
    {
      label: "Pedidos à espera de resposta",
      value: results[3].count ?? 0,
      Icon: Clock,
      href: "/admin/reservas?estado=pending",
    },
    {
      label: "Reservas com início hoje",
      value: results[4].count ?? 0,
      Icon: CalendarDays,
      href: `/admin/reservas?estado=confirmed&de=${today}&ate=${today}`,
    },
    {
      label: "Reservas confirmadas em curso ou futuras",
      value: results[5].count ?? 0,
      Icon: CalendarDays,
      href: "/admin/reservas?estado=confirmed",
    },
  ];
  const activity = results[6].data as
    { id: string; action: string; created_at: string }[] | null;
  return (
    <main id="main" className="shell category-page">
      <span className="eyebrow coral">IBIZA ADMIN</span>
      <h1>A operação, num só lugar.</h1>
      <p className="lead">
        Acompanha o que precisa de atenção e o que já está confirmado.
      </p>
      <AdminNav current="/admin" />
      <div className="admin-metrics">
        {metrics.map((m) => (
          <Link href={m.href} key={m.label} className="admin-metric">
            <m.Icon size={23} aria-hidden="true" />
            <strong>{m.value}</strong>
            <span>{m.label}</span>
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        ))}
      </div>
      <p className="notice">
        Valores operacionais consultados ao abrir a página. Horário de
        Moçambique. Pedidos expirados não entram na fila de resposta. Reservas
        não representam pagamentos recebidos.
      </p>
      <section className="account-card">
        <h2>Actividade recente</h2>
        {activity?.length ? (
          <ol className="audit-timeline">
            {activity.map((a) => (
              <li key={a.id}>
                <strong>{auditLabels[a.action] ?? a.action}</strong>
                <time dateTime={a.created_at}>
                  {formatPeriod(a.created_at)}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p>A actividade da plataforma aparecerá aqui.</p>
        )}
        <Button asChild variant="outline">
          <Link href="/admin/auditoria">
            Consultar histórico completo
            <ArrowUpRight size={18} />
          </Link>
        </Button>
      </section>
    </main>
  );
}
export const dynamic = "force-dynamic";
