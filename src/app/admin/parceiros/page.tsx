import { PartnerStatusForm } from "@/components/forms/partner-status-form";
import { AdminNav, AdminPagination } from "@/components/admin/navigation";
import { adminPage, adminHref } from "@/features/admin/filters";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/features/auth/session";
import { ReviewForm } from "@/components/forms/review-form";
import { statusLabels } from "@/features/partners/validation";
export const metadata = { title: "Aprovação de parceiros" };
export default async function PartnersAdmin({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; estado?: string }>;
}) {
  const { supabase } = await requireAdmin("/admin/parceiros");
  const p = await searchParams;
  const page = adminPage(p.pagina);
  const status = ["pending", "approved", "rejected", "suspended"].includes(
    p.estado ?? "",
  )
    ? p.estado!
    : "";
  let query = supabase
    .from("partner_applications")
    .select("id,organization_id,status,notes,created_at", { count: "exact" });
  if (status) query = query.eq("status", status);
  const {
    data: applications,
    error,
    count,
  } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * 20, page * 20 - 1);
  if (error) throw new Error("Não foi possível carregar candidaturas.");
  const ids = applications?.map((a) => a.organization_id) ?? [];
  const [orgResult, detailResult] = await Promise.all([
    ids.length
      ? supabase.from("organizations").select("id,name,approval").in("id", ids)
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? supabase.from("partner_details").select("*").in("organization_id", ids)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const { data: orgs, error: orgError } = orgResult;
  const { data: details, error: detailsError } = detailResult;
  if (orgError || detailsError)
    throw new Error("Não foi possível carregar os negócios.");
  return (
    <main id="main" className="shell category-page">
      <AdminNav current="/admin/parceiros" />
      <span className="eyebrow coral">IBIZA ADMIN</span>
      <h1>Candidaturas de parceiros.</h1>
      <p className="lead">
        Todas as candidaturas, organizadas por estado. As decisões ficam na
        auditoria.
      </p>
      <form method="get" action="/admin/parceiros" className="offer-filters">
        <label>
          Estado da candidatura
          <select name="estado" defaultValue={status}>
            <option value="">Todos</option>
            {["pending", "approved", "rejected", "suspended"].map((value) => (
              <option key={value} value={value}>
                {statusLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <Button>
          <Search size={18} aria-hidden="true" />
          Filtrar candidaturas
        </Button>
      </form>
      <div className="admin-applications">
        {!applications?.length && (
          <p className="empty-state">
            Nenhuma candidatura encontrada para este filtro.
          </p>
        )}
        {applications?.map((a) => {
          const d = details?.find(
            (x) => x.organization_id === a.organization_id,
          );
          return (
            <article className="account-panel" key={a.id}>
              <span className="status-badge">{statusLabels[a.status]}</span>
              <h2>
                {orgs?.find((o) => o.id === a.organization_id)?.name ??
                  "Negócio"}
              </h2>
              <p>
                Estado actual do negócio:{" "}
                {
                  statusLabels[
                    orgs?.find((o) => o.id === a.organization_id)?.approval ??
                      "pending"
                  ]
                }
              </p>
              {d && (
                <>
                  <p>
                    {d.business_type} · {d.location}
                  </p>
                  <p>
                    {d.contact_email} · {d.phone}
                  </p>
                  <p>{d.description}</p>
                </>
              )}
              {["approved", "suspended"].includes(
                orgs?.find((o) => o.id === a.organization_id)?.approval ?? "",
              ) && (
                <PartnerStatusForm
                  id={a.organization_id}
                  active={
                    orgs?.find((o) => o.id === a.organization_id)?.approval ===
                    "approved"
                  }
                />
              )}
              {a.status === "pending" ? (
                <ReviewForm id={a.id} />
              ) : (
                <p>Justificação: {a.notes}</p>
              )}
            </article>
          );
        })}
      </div>
      <AdminPagination
        page={page}
        count={count ?? 0}
        href={(n) => adminHref("/admin/parceiros", { estado: status }, n)}
      />
    </main>
  );
}
export const dynamic = "force-dynamic";
