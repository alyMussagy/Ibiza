import Link from "next/link";
import { requireUser } from "@/features/auth/session";
import { statusLabels } from "@/features/partners/validation";
export const metadata = { title: "Área de parceiro" };
export default async function PartnerDashboard() {
  const { supabase, user } = await requireUser("/business/painel");
  const { data: members, error } = await supabase
    .from("organization_members")
    .select("organization_id,role")
    .eq("profile_id", user.id);
  if (error) throw new Error("Não foi possível consultar a área de parceiro.");
  const ids = (members ?? []).map((x) => x.organization_id);
  const { data: organizations, error: orgError } = ids.length
    ? await supabase
        .from("organizations")
        .select("id,name,approval")
        .in("id", ids)
    : { data: [], error: null };
  const { data: applications, error: appError } = await supabase
    .from("partner_applications")
    .select("id,organization_id,status,notes,created_at")
    .eq("submitted_by", user.id)
    .order("created_at", { ascending: false });
  if (orgError || appError)
    throw new Error("Não foi possível consultar as candidaturas.");
  return (
    <main id="main" className="shell category-page">
      <span className="eyebrow coral">IBIZA BUSINESS</span>
      <h1>O teu negócio, por perto.</h1>
      <p className="lead">Acompanha o estado da tua relação com o IBIZA.</p>
      {!organizations?.length ? (
        <div className="empty-state">
          <h2>Ainda não tens um negócio associado.</h2>
          <p>Envia uma candidatura para a equipa conhecer a tua actividade.</p>
        </div>
      ) : (
        <div className="info-grid">
          {organizations.map((org) => (
            <article key={org.id}>
              <span className="status-badge">{statusLabels[org.approval]}</span>
              <h2>{org.name}</h2>
              <p>
                {org.approval === "approved"
                  ? "Parceiro aprovado. A gestão de anúncios será disponibilizada na Fase 3."
                  : "Os serviços deste negócio não podem ser publicados enquanto a aprovação não estiver activa."}
              </p>
              {applications
                ?.filter((a) => a.organization_id === org.id)
                .map((a) => (
                  <div key={a.id}>
                    <p>Candidatura: {statusLabels[a.status]}</p>
                    {a.notes && <p>Decisão da equipa: {a.notes}</p>}
                  </div>
                ))}
            </article>
          ))}
        </div>
      )}
      <div className="account-links">
        <Link href="/business/candidatura" className="text-link">
          Apresentar um negócio →
        </Link>
        <Link href="/perfil">Voltar à minha conta</Link>
      </div>
    </main>
  );
}
export const dynamic = "force-dynamic";
