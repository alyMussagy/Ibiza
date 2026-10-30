import Link from "next/link";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import { AuthForm, type AuthMode } from "@/components/forms/auth-form";
export function AuthShell({
  mode,
  title,
  description,
  next,
  notice,
}: {
  mode: AuthMode;
  title: string;
  description: string;
  next?: string;
  notice?: string;
}) {
  const enabled = hasSupabaseConfig();
  return (
    <main id="main" className="shell account-page">
      <section className="account-story">
        <span className="eyebrow coral">O TEU PRÓXIMO CAPÍTULO</span>
        <h1>
          Mais perto
          <br />
          do que te faz bem.
        </h1>
        <p>
          Uma conta para descobrires Inhambane e fazeres parte da comunidade
          IBIZA.
        </p>
        <Link href="/explorar" className="text-link">
          Continua a explorar →
        </Link>
      </section>
      <section className="account-panel">
        <span className="eyebrow coral">IBIZA · A TUA CONTA</span>
        <h2>{title}</h2>
        <p>{description}</p>
        {!enabled && (
          <p className="notice" role="status">
            O acesso a contas está em preparação. Podes continuar a explorar o
            IBIZA.
          </p>
        )}
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        <AuthForm mode={mode} enabled={enabled} next={next} />
        <div className="account-links">
          {mode === "login" ? (
            <>
              <Link href="/recuperar-conta">Esqueceste a palavra-passe?</Link>
              <span>
                Ainda não tens conta? <Link href="/registo">Regista-te</Link>
              </span>
            </>
          ) : (
            <Link href="/login">Já tenho conta · Entrar</Link>
          )}
        </div>
      </section>
    </main>
  );
}
