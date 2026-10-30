import Link from "next/link";
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
      <p className="lead">{user.email}</p>
      {(error || p.notice) && (
        <p className="notice">
          {p.notice === "sem-permissao"
            ? "Esta conta não tem permissão para aceder à administração."
            : p.notice === "logout-failed"
              ? "Não foi possível terminar sessão. Tenta novamente."
              : "Não foi possível carregar o perfil. Tenta novamente mais tarde."}
        </p>
      )}
      <div className="info-grid">
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
            Recuperar acesso →
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
