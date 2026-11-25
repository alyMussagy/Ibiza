import Link from "next/link";
import {
  Activity, ArrowRight, ArrowUpRight, Building2, CalendarDays,
  CheckCheck, Clock3, Compass, Monitor, Smartphone, Store, Tablet, UsersRound,
} from "lucide-react";
import { requireAdmin } from "@admin/lib/auth";
import { formatPeriod } from "@/features/reservations/validation";
import { auditLabels } from "@/features/admin/filters";
import "./overview.css";

export const metadata = { title: "Centro de operações" };
export const dynamic = "force-dynamic";

type Ranked = { source: string; count: number };
type Traffic = {
  sessions: number;
  devices: { mobile: number; desktop: number; tablet: number };
  sources: Ranked[];
  lead_sources: Ranked[];
  locations: { country: string | null; region: string | null; city: string | null; count: number }[];
  trend: { day: string; count: number }[];
};
const number = (value: number | null) => new Intl.NumberFormat("pt-MZ").format(value ?? 0);

function RankedPanel({ title, description, items, empty, className = "" }: { title: string; description: string; items: Ranked[]; empty: string; className?: string }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return <section className={`ops-panel ${className}`}>
    <div className="ops-panel-head"><div><h3>{title}</h3><p>{description}</p></div></div>
    {items.length ? <ol className="ops-rank-list">{items.map((item) => <li key={item.source}>
      <div><span>{item.source}</span><strong>{number(item.count)}</strong></div>
      <span className="ops-track"><span style={{ width: `${item.count / max * 100}%` }} /></span>
    </li>)}</ol> : <p className="ops-empty">{empty}</p>}
  </section>;
}

function Trend({ traffic, days }: { traffic: Traffic | null; days: number }) {
  if (!traffic) return <p className="ops-empty">A medição de acessos está a ser preparada.</p>;
  if (!traffic.sessions) return <p className="ops-empty">As primeiras sessões aparecerão aqui.</p>;
  const buckets = days === 7 ? 7 : days === 30 ? 10 : 12;
  const today = Date.now();
  const chart = Array.from({ length: buckets }, (_, index) => {
    const from = today - (days - index * days / buckets) * 86400000;
    const to = today - (days - (index + 1) * days / buckets) * 86400000;
    return {
      label: new Intl.DateTimeFormat("pt-MZ", { day: "2-digit", month: "short", timeZone: "Africa/Maputo" }).format(to),
      value: traffic.trend.reduce((total, entry) => {
        const date = Date.parse(`${entry.day}T12:00:00+02:00`);
        return date >= from && date < to ? total + entry.count : total;
      }, 0),
    };
  });
  const max = Math.max(1, ...chart.map((item) => item.value));
  return <div className="ops-chart" role="img" aria-label={`Sessões por período: ${chart.map((item) => `${item.label}, ${item.value}`).join("; ")}`}>
    {chart.map((item, index) => <div key={index} className="ops-chart-column">
      <strong>{item.value || ""}</strong><span className="ops-chart-bar"><span style={{ height: `${Math.max(3, item.value / max * 100)}%` }} /></span><small>{item.label}</small>
    </div>)}
  </div>;
}

export default async function AdminOverview({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const { supabase } = await requireAdmin("/");
  const { dias } = await searchParams;
  const days = dias === "7" || dias === "90" ? Number(dias) : 30;
  const now = new Date();
  const since = new Date(now.getTime() - days * 86400000).toISOString();
  const today = new Date(now.getTime() + 7200000).toISOString().slice(0, 10);
  const start = `${today}T00:00:00+02:00`;
  const end = new Date(Date.parse(start) + 86400000).toISOString();
  const [counts, audit, trafficResult] = await Promise.all([
    Promise.all([
      supabase.from("partner_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("organizations").select("id", { count: "exact", head: true }).eq("approval", "approved"),
      supabase.from("listings").select("id", { count: "exact", head: true }).eq("review_status", "pending"),
      supabase.from("reservations").select("id", { count: "exact", head: true }).eq("status", "pending").gt("expires_at", now.toISOString()),
      supabase.from("reservations").select("id", { count: "exact", head: true }).eq("status", "confirmed").gte("starts_at", start).lt("starts_at", end),
      supabase.from("reservations").select("id", { count: "exact", head: true }).eq("status", "confirmed").gte("created_at", since),
      supabase.from("reservations").select("id", { count: "exact", head: true }).eq("status", "cancelled").gte("updated_at", since),
      supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("partner_applications").select("id", { count: "exact", head: true }).gte("created_at", since),
    ]),
    supabase.from("audit_logs").select("id,action,created_at").order("created_at", { ascending: false }).order("id", { ascending: false }).limit(7),
    supabase.rpc("admin_traffic_summary", { period_days: days }),
  ]);
  if (counts.some((result) => result.error) || audit.error)
    throw new Error("Não foi possível carregar a operação do IBIZA.");

  const traffic = trafficResult.error ? null : trafficResult.data as Traffic | null;
  const devices = traffic?.devices ?? { mobile: 0, desktop: 0, tablet: 0 };
  const queue = [
    { label: "Candidaturas por rever", value: counts[0].count, href: "/parceiros?estado=pending", Icon: Building2 },
    { label: "Anúncios por rever", value: counts[2].count, href: "/anuncios", Icon: Store },
    { label: "Pedidos por responder", value: counts[3].count, href: "/reservas?estado=pending", Icon: Clock3 },
    { label: "Reservas com início hoje", value: counts[4].count, href: `/reservas?estado=confirmed&de=${today}&ate=${today}`, Icon: CalendarDays },
  ];
  const deviceRows = [
    { label: "Telemóvel", value: devices.mobile, Icon: Smartphone },
    { label: "Computador", value: devices.desktop, Icon: Monitor },
    { label: "Tablet", value: devices.tablet, Icon: Tablet },
  ];
  const activity = audit.data as { id: string; action: string; created_at: string }[] | null;
  const countryNames = new Intl.DisplayNames(["pt-MZ"], { type: "region" });
  const locations = (traffic?.locations ?? []).map((item) => ({
    source: item.country
      ? `${item.city || item.region || "Cidade não identificada"} · ${countryNames.of(item.country) || item.country}`
      : "Localização indisponível",
    count: item.count,
  }));

  return <main id="main" className="shell ops-dashboard">
    <header className="ops-intro"><div><span className="eyebrow coral">IBIZA · CENTRO DE OPERAÇÕES</span>
      <h1>O pulso da plataforma.</h1><p>Parceiros, reservas e descoberta do IBIZA numa leitura clara para decidir o próximo passo.</p></div>
      <span className="ops-live"><Activity size={16} aria-hidden="true" /> Actualizado ao abrir</span></header>

    <section className="ops-section" aria-labelledby="ops-now-title"><div className="ops-section-head"><div><span className="ops-kicker">AGORA</span><h2 id="ops-now-title">O que precisa de atenção</h2></div><span className="ops-muted">Horário de Moçambique</span></div>
      <div className="ops-queue">{queue.map(({ label, value, href, Icon }) => <Link href={href} className="ops-queue-card" key={label}>
        <span className="ops-card-icon"><Icon size={19} aria-hidden="true" /></span><strong>{number(value)}</strong><span>{label}</span><ArrowUpRight className="ops-card-arrow" size={19} aria-hidden="true" />
      </Link>)}</div></section>

    <section className="ops-section" aria-labelledby="ops-discovery-title"><div className="ops-section-head"><div><span className="ops-kicker">DESCOBERTA</span><h2 id="ops-discovery-title">Como chegam ao IBIZA</h2></div>
      <nav className="ops-period" aria-label="Período de análise">{[7,30,90].map((period) => <Link key={period} href={`/?dias=${period}`} aria-current={days === period ? "page" : undefined}>{period} dias</Link>)}</nav></div>
      <div className="ops-discovery-grid">
        <section className="ops-panel ops-traffic-panel"><div className="ops-panel-head"><div><h3>Sessões no site</h3><p>Visitas no período seleccionado</p></div><Compass size={21} aria-hidden="true" /></div>
          <strong className="ops-big-number">{traffic ? number(traffic.sessions) : "—"}</strong><Trend traffic={traffic} days={days} /></section>
        <section className="ops-panel"><div className="ops-panel-head"><div><h3>Dispositivos</h3><p>Como exploram o site</p></div><Monitor size={21} aria-hidden="true" /></div>
          {traffic?.sessions ? <div className="ops-device-list">{deviceRows.map(({ label, value, Icon }) => <div className="ops-device-row" key={label}>
            <span><Icon size={17} aria-hidden="true" />{label}</span><span className="ops-track"><span style={{ width: `${value / traffic.sessions * 100}%` }} /></span><strong>{Math.round(value / traffic.sessions * 100)}%</strong>
          </div>)}</div> : <p className="ops-empty">{traffic ? "Ainda não há sessões para comparar." : "A medição de dispositivos está a ser preparada."}</p>}</section>
        <RankedPanel title="Origem das visitas" description="Canal da primeira visita de cada sessão" items={traffic?.sources ?? []} empty={traffic ? "As origens aparecerão com as primeiras sessões." : "A medição de origens está a ser preparada."} />
        <RankedPanel title="Leads de parceiros" description={`${number(counts[8].count)} candidaturas no período · primeira origem conhecida`} items={traffic?.lead_sources ?? []} empty={traffic ? "Ainda não há candidaturas neste período." : "A atribuição de candidaturas está a ser preparada."} />
        <RankedPanel className="ops-location-panel" title="De onde nos visitam" description="País e cidade aproximados pela rede · sem localização precisa" items={locations} empty={traffic ? "A localização das novas visitas aparecerá aqui." : "A medição de localização está a ser preparada."} />
      </div></section>

    <section className="ops-section" aria-labelledby="ops-work-title"><div className="ops-section-head"><div><span className="ops-kicker">OPERAÇÃO</span><h2 id="ops-work-title">Reservas e catálogo</h2></div><Link className="ops-link" href="/reservas">Gerir reservas <ArrowRight size={16} /></Link></div>
      <div className="ops-performance">
        <div><CheckCheck size={20} /><strong>{number(counts[5].count)}</strong><span>Reservas confirmadas · {days} dias</span></div>
        <div><CalendarDays size={20} /><strong>{number(counts[6].count)}</strong><span>Reservas canceladas · {days} dias</span></div>
        <div><Store size={20} /><strong>{number(counts[7].count)}</strong><span>Anúncios publicados</span></div>
        <div><UsersRound size={20} /><strong>{number(counts[1].count)}</strong><span>Parceiros aprovados</span></div>
      </div><p className="ops-data-note">Reservas representam pedidos, não pagamentos recebidos. Pedidos expirados não entram na fila.</p></section>

    <section className="ops-panel ops-activity" aria-labelledby="ops-activity-title"><div className="ops-panel-head"><div><span className="ops-kicker">HISTÓRICO</span><h2 id="ops-activity-title">Actividade recente</h2></div><Link href="/auditoria">Ver auditoria <ArrowUpRight size={17} /></Link></div>
      {activity?.length ? <ol>{activity.map((item) => <li key={item.id}><span className="ops-activity-dot" /><strong>{auditLabels[item.action] ?? item.action}</strong><time dateTime={item.created_at}>{formatPeriod(item.created_at)}</time></li>)}</ol>
        : <p className="ops-empty">As primeiras decisões e pedidos aparecerão aqui.</p>}
    </section>
  </main>;
}
