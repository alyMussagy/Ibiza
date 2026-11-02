import Link from "next/link";
import { ProfileForm } from "@/components/forms/profile-form";
import { requireUser } from "@/features/auth/session";
import { logoutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
export const metadata = { title: "A minha conta" };
export default async function Profile({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const p = await searchParams;
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const { data: role } = await supabase
    .from("platform_roles")
    .select("role")
    .eq("profile_id", user.id)
    .maybeSingle();
  return (
    <main id="main" className="shell category-page">
      <span className="eyebrow coral">A MINHA CONTA</span>
      <h1>Olá, {profile?.display_name || "viajante"}.</h1>
      <p className="lead">
        O teu espaço para descobrir lugares, gerir o acesso e acompanhar o teu
        negócio.
      </p>
      <section className="profile-plan">
        <div>
          <span className="eyebrow coral">O TEU PRÓXIMO PLANO</span>
          <h2>Há mais para viver em Inhambane.</h2>
          <p>
            Escolhe o que te apetece e encontra ideias para a próxima
            escapadinha.
          </p>
        </div>
        <Button asChild>
          <Link href="/comecar">Encontrar o meu próximo plano →</Link>
        </Button>
      </section>
      <div className="info-grid profile-details">
        <article>
          <h2>Dados da conta</h2>
          <ProfileForm name={profile?.display_name || ""} />
          <dl>
            <dt>Email</dt>
            <dd>{user.email}</dd>
            <dt>Estado</dt>
            <dd>Email confirmado</dd>
            <dt>Membro desde</dt>
            <dd>
              {new Intl.DateTimeFormat("pt-MZ", { dateStyle: "long" }).format(
                new Date(user.created_at),
              )}
            </dd>
          </dl>
        </article>
        <article>
          <h2>As tuas próximas viagens</h2>
          <p>
            O IBIZA está a preparar as reservas. Por enquanto, podes descobrir
            destinos, alojamentos e experiências no catálogo de demonstração.
          </p>
          <Link href="/explorar" className="text-link">
            Explorar o catálogo →
          </Link>
        </article>
      </div>
      {(error || p.notice) && (
        <p className="notice">
          {p.notice === "sem-permissao"
            ? "Esta conta não tem permissão para aceder à administração."
            : p.notice === "logout-failed"
              ? "Não foi possível terminar sessão. Tenta novamente."
              : "Não foi possível carregar o perfil. Tenta novamente mais tarde."}
        </p>
      )}
      <div className="info-grid profile-details">
        <article>
          <h2>IBIZA Business</h2>
          <p>Apresenta o teu negócio ou acompanha a tua candidatura.</p>
          <Link href="/business/painel" className="text-link">
            Abrir área de parceiro →
          </Link>
        </article>
        <article>
          <h2>Segurança</h2>
          <p>
            Podes solicitar uma ligação por email para redefinir a
            palavra-passe.
          </p>
          <Link href="/recuperar-conta" className="text-link">
            Alterar palavra-passe →
          </Link>
        </article>
        {role?.role === "super_admin" && (
          <article>
            <h2>Administração</h2>
            <Link href="/admin/parceiros" className="text-link">
              Rever candidaturas →
            </Link>
          </article>
        )}
      </div>
      <form action={logoutAction}>
        <Button type="submit" variant="outline">
          Terminar sessão
        </Button>
      </form>
    </main>
  );
}
export const dynamic = "force-dynamic";
