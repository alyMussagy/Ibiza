import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, MapPin } from "lucide-react";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import { AuthForm, type AuthMode } from "@/components/forms/auth-form";
import { googleAuthAction } from "@/features/auth/actions";
import { GoogleAuthButton } from "@/components/forms/google-auth-button";
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
  const isRegister = mode === "register";
  return (
    <main id="main" className="shell account-page">
      <section className="account-story">
        <Image
          src={isRegister ? "/images/auth-vilankulo.webp" : "/images/auth-tofo.webp"}
          alt={isRegister ? "Praia de Vilanculos, em Inhambane" : "Praia do Tofo, em Inhambane"}
          fill
          priority
          sizes="(max-width: 760px) 100vw, 50vw"
        />
        <div className="account-story-shade" />
        <div className="account-story-content">
          <span className="eyebrow">O TEU PRÓXIMO CAPÍTULO</span>
          <h1>
            Mais perto
            <br />
            do que te faz bem.
          </h1>
          <p>Inhambane espera por ti. Guarda os lugares e experiências que queres viver.</p>
          <Link href="/ofertas" className="account-story-link">
            Explorar ofertas <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>
        <div className="account-story-bottom">
          <span><MapPin size={16} aria-hidden="true" /> {isRegister ? "Vilanculos" : "Praia do Tofo"} · Inhambane</span>
          <span className="account-story-credit">
            Foto: {isRegister ? "Tom Corser" : "Erik Cleves Kristensen"} ·{" "}
            <a
              href={isRegister ? "https://commons.wikimedia.org/wiki/File:Vilaculos_beach_Mozambique.jpg" : "https://commons.wikimedia.org/wiki/File:Praia_do_Tofo_Moz_view_2008.jpg"}
              target="_blank"
              rel="noopener noreferrer"
            >
              {isRegister ? "CC BY-SA 3.0" : "CC BY 2.0"}
            </a>
          </span>
        </div>
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
        {(mode === "login" || mode === "register") && (
          <div className="social-auth">
            <div className="social-auth-divider"><span>ou continua com</span></div>
            <form action={googleAuthAction}>
              <input type="hidden" name="next" value={next || "/comecar"} />
              <GoogleAuthButton enabled={enabled} />
            </form>
          </div>
        )}
        {(mode === "login" || mode === "register") && (
          <p className="auth-privacy">
            Descobre como usamos os teus dados na nossa{" "}
            <Link href="/privacidade">página de privacidade</Link>.
          </p>
        )}
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

