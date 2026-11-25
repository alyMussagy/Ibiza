import { requireUser } from "@/features/auth/session";
import { TeamForm } from "@/components/forms/team-form";
export default async function Team() {
  const { supabase, user } = await requireUser("/business/equipa");
  const { data: owned, error } = await supabase
    .from("organization_members")
    .select("organization_id,organizations(name)")
    .eq("profile_id", user.id)
    .eq("role", "owner");
  if (error) throw new Error("Não foi possível consultar os negócios.");
  const ids = (owned ?? []).map((o) => o.organization_id);
  const { data: members, error: memberError } = ids.length
    ? await supabase
        .from("organization_members")
        .select("organization_id,profile_id,role")
        .in("organization_id", ids)
    : { data: [], error: null };
  if (memberError) throw new Error("Não foi possível carregar a equipa.");
  return (
    <main id="main" className="shell category-page">
      <span className="eyebrow coral">IBIZA BUSINESS</span>
      <h1>A tua equipa.</h1>
      <p className="lead">
        Só o proprietário pode alterar os acessos. Pede ao colaborador o
        identificador apresentado na página da conta.
      </p>
      {owned?.map((o) => (
        <section key={o.organization_id} className="account-card">
          <h2>
            {
              (Array.isArray(o.organizations)
                ? o.organizations[0]
                : o.organizations
              )?.name
            }
          </h2>
          {members
            ?.filter((m) => m.organization_id === o.organization_id)
            .map((m) => (
              <p key={m.profile_id}>
                <code>{m.profile_id}</code> · {m.role}
              </p>
            ))}
          <TeamForm id={o.organization_id} />
        </section>
      ))}
      {!owned?.length && (
        <p className="notice">
          Esta área está disponível aos proprietários dos negócios.
        </p>
      )}
    </main>
  );
}
export const dynamic = "force-dynamic";
