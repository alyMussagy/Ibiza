import { ShieldCheck } from "lucide-react";
import { AdminLoginForm } from "@admin/components/login-form";
import { adminNext } from "@admin/lib/auth";
import { googleSignInAdmin } from "@admin/lib/actions";
import { GoogleAuthButton } from "@/components/forms/google-auth-button";
import { hasSupabaseConfig } from "@/lib/supabase/server";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; notice?: string }> }) {
  const { next, notice } = await searchParams;
  const destination = adminNext(next);
  const message = {
    "google-unavailable": "Não foi possível ligar ao Google. Tenta novamente.",
    "google-cancelled": "A entrada com Google foi interrompida. Podes tentar novamente.",
    "invalid-link": "A ligação de entrada expirou ou não é válida. Tenta novamente.",
    "no-access": "Esta conta Google não tem acesso à administração do IBIZA.",
  }[notice || ""];
  return (
    <main id="main" className="admin-login-wrap">
      <div className="admin-login-copy">
        <span className="eyebrow coral">IBIZA · CENTRO DE OPERAÇÕES</span>
        <h1>Onde o IBIZA ganha vida.</h1>
        <span className="admin-login-accent" aria-hidden="true" />
        <p>Parceiros, anúncios, reservas e decisões da plataforma num espaço reservado à equipa.</p>
      </div>
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <ShieldCheck size={28} color="#ed3153" aria-hidden="true" />
        <h2 id="admin-login-title">Acesso à administração</h2>
        <p>Entra com a conta administradora do IBIZA.</p>
        {message && <p className="form-error" role="alert">{message}</p>}
        <form action={googleSignInAdmin} className="admin-google-form">
          <input type="hidden" name="next" value={destination} />
          <GoogleAuthButton enabled={hasSupabaseConfig()} />
        </form>
        <div className="social-auth-divider admin-login-divider">ou entra com email e palavra-passe</div>
        <AdminLoginForm next={destination} />
      </section>
    </main>
  );
}
