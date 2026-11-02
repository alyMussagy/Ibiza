import { History, Search } from "lucide-react";
import { requireAdmin } from "@/features/auth/session";
import { AdminNav, AdminPagination } from "@/components/admin/navigation";
import { Button } from "@/components/ui/button";
import {
  adminPage,
  adminDate,
  afterDate,
  adminHref,
  auditLabels,
} from "@/features/admin/filters";
import { formatPeriod } from "@/features/reservations/validation";
export const metadata = { title: "Histórico de auditoria" };
const groups: Record<string, string> = {
  partner: "Parceiros",
  listing: "Anúncios",
  availability: "Disponibilidade",
  reservation: "Reservas",
};
export default async function Audit({
  searchParams,
}: {
  searchParams: Promise<{
    pagina?: string;
    area?: string;
    de?: string;
    ate?: string;
  }>;
}) {
  const { supabase } = await requireAdmin("/admin/auditoria");
  const p = await searchParams;
  const page = adminPage(p.pagina),
    group = Object.hasOwn(groups, p.area ?? "") ? p.area! : "",
    from = adminDate(p.de),
    to = adminDate(p.ate);
  let query = supabase
    .from("audit_logs")
    .select("id,actor_id,organization_id,action,details,created_at", {
      count: "exact",
    });
  if (group) query = query.like("action", `${group}.%`);
  if (from) query = query.gte("created_at", from + "T00:00:00+02:00");
  if (to) query = query.lt("created_at", afterDate(to));
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * 20, page * 20 - 1);
  if (error) throw new Error("Não foi possível consultar a auditoria.");
  return (
    <main id="main" className="shell category-page">
      <span className="eyebrow coral">HISTÓRICO DA OPERAÇÃO</span>
      <h1>Auditoria.</h1>
      <p className="lead">
        Consulta quem realizou cada acção e quando aconteceu.
      </p>
      <AdminNav current="/admin/auditoria" />
      <form method="get" action="/admin/auditoria" className="offer-filters">
        <label>
          Área
          <select name="area" defaultValue={group}>
            <option value="">Todas</option>
            {Object.entries(groups).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Desde
          <input type="date" name="de" defaultValue={from} />
        </label>
        <label>
          Até
          <input type="date" name="ate" defaultValue={to} />
        </label>
        <Button>
          <Search size={18} />
          Filtrar histórico
        </Button>
      </form>
      <p className="notice">
        Registos apenas para consulta. Datas no horário de Moçambique.
        Identificadores permitem relacionar cada acção com a conta, o negócio e
        a operação.
      </p>
      {data?.length ? (
        <div className="admin-applications">
          {data.map((a) => (
            <article className="account-panel" key={a.id}>
              <span className="status-badge">{formatPeriod(a.created_at)}</span>
              <h2>{auditLabels[a.action] ?? a.action}</h2>
              <dl className="audit-identifiers">
                <dt>Conta responsável</dt>
                <dd>{a.actor_id ?? "Sistema"}</dd>
                <dt>Negócio</dt>
                <dd>{a.organization_id ?? "Não associado"}</dd>
                <dt>Registo</dt>
                <dd>{a.id}</dd>
              </dl>
              <details>
                <summary>Ver detalhes da operação</summary>
                <pre className="audit-json">
                  {JSON.stringify(a.details, null, 2)}
                </pre>
              </details>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <History size={36} />
          <h2>Nenhum registo neste período.</h2>
        </div>
      )}
      <AdminPagination
        page={page}
        count={count ?? 0}
        href={(n) =>
          adminHref("/admin/auditoria", { area: group, de: from, ate: to }, n)
        }
      />
    </main>
  );
}
export const dynamic = "force-dynamic";
