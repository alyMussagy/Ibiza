import Link from "next/link";
import {
  Heart,
  Compass,
  ArrowUpRight,
  UserRound,
  CalendarDays,
  Building2,
  ShieldCheck,
  LayoutDashboard,
  LogOut,
  KeyRound,
} from "lucide-react";
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
          <Link href="/comecar">
            <Compass size={20} aria-hidden="true" />
            Encontrar o meu próximo plano
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </Button>
      </section>
      <div className="info-grid profile-details">
        <article>
          <span className="account-card-icon">
            <UserRound size={23} aria-hidden="true" />
          </span>
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
          <span className="account-card-icon">
            <CalendarDays size={23} aria-hidden="true" />
          </span>
          <h2>As tuas próximas viagens</h2>
          <p>
            Consulta os teus pedidos e acompanha as confirmações dos parceiros.
          </p>
          <Button asChild variant="outline">
            <Link href="/reservas">
              <Compass size={18} aria-hidden="true" />
              Ver as minhas reservas
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </Button>
        </article>
      </div>
      <section className="profile-plan">
        <div>
          <span className="eyebrow coral">À TUA ESPERA</span>
          <h2>Os lugares que queres conhecer.</h2>
          <p>
            Reúne os teus favoritos e volta a eles quando planeares a próxima
            saída.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/favoritos">
            <Heart size={20} aria-hidden="true" />
            Ver os meus favoritos
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </Button>
      </section>
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
          <span className="account-card-icon">
            <Building2 size={23} aria-hidden="true" />
          </span>
          <h2>IBIZA Business</h2>
          <p>Apresenta o teu negócio ou acompanha a tua candidatura.</p>
          <Button asChild variant="outline">
            <Link href="/business/painel">
              <Building2 size={18} aria-hidden="true" />
              Abrir área de parceiro
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </Button>
        </article>
        <article>
          <span className="account-card-icon">
            <ShieldCheck size={23} aria-hidden="true" />
          </span>
          <h2>Segurança</h2>
          <p>
            Podes solicitar uma ligação por email para redefinir a
            palavra-passe.
          </p>
          <Button asChild variant="outline">
            <Link href="/recuperar-conta">
              <KeyRound size={18} aria-hidden="true" />
              Alterar palavra-passe
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </Button>
        </article>
        {role?.role === "super_admin" && (
          <article>
            <span className="account-card-icon">
              <LayoutDashboard size={23} aria-hidden="true" />
            </span>
            <h2>Administração</h2>
            <Button asChild variant="outline">
              <Link href="/admin">
                <ShieldCheck size={18} aria-hidden="true" />
                Abrir painel administrativo
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </Button>
          </article>
        )}
      </div>
      <form action={logoutAction}>
        <Button type="submit" variant="outline">
          <LogOut size={18} aria-hidden="true" />
          Terminar sessão
        </Button>
      </form>
    </main>
  );
}
export const dynamic = "force-dynamic";
