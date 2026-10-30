import { requireAdmin } from "@/features/auth/session";
import { ReviewForm } from "@/components/forms/review-form";
import { statusLabels } from "@/features/partners/validation";
export const metadata = { title: "Aprovação de parceiros" };
export default async function PartnersAdmin() {
  const { supabase } = await requireAdmin();
  const { data: applications, error } = await supabase
    .from("partner_applications")
    .select("id,organization_id,status,notes,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Não foi possível carregar candidaturas.");
  const ids = applications?.map((a) => a.organization_id) ?? [];
  const { data: orgs, error: orgError } = ids.length
    ? await supabase.from("organizations").select("id,name").in("id", ids)
    : { data: [], error: null };
  const { data: details, error: detailsError } = ids.length
    ? await supabase
        .from("partner_details")
        .select("*")
        .in("organization_id", ids)
    : { data: [], error: null };
  if (orgError || detailsError)
    throw new Error("Não foi possível carregar os negócios.");
  return (
    <main id="main" className="shell category-page">
      <span className="eyebrow coral">IBIZA ADMIN</span>
      <h1>Candidaturas de parceiros.</h1>
      <p className="lead">
        Últimas 100 candidaturas. Todas as decisões ficam registadas na
        auditoria.
      </p>
      <div className="admin-applications">
        {!applications?.length && (
          <p className="empty-state">Ainda não existem candidaturas.</p>
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
              {a.status === "pending" ? (
                <ReviewForm id={a.id} />
              ) : (
                <p>Justificação: {a.notes}</p>
              )}
            </article>
          );
        })}
      </div>
    </main>
  );
}
export const dynamic = "force-dynamic";
