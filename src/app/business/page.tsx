import Link from "next/link";
import { Building2, ShieldCheck, LayoutDashboard } from "lucide-react";
export const metadata = { title: "IBIZA Business" };
export default function Business() {
  return (
    <main id="main" className="shell category-page">
      <span className="eyebrow coral">IBIZA BUSINESS</span>
      <h1>
        Local por natureza.
        <br />
        Ligado a novas possibilidades.
      </h1>
      <p className="lead">
        Uma área para apresentar o teu negócio e acompanhar a aprovação pela
        equipa IBIZA.
      </p>
      <div className="info-grid">
        {[
          [
            Building2,
            "O teu espaço no IBIZA",
            "Uma presença para apresentar o teu negócio.",
          ],
          [
            ShieldCheck,
            "Parceiros verificados",
            "Todas as candidaturas estarão sujeitas a aprovação manual.",
          ],
          [
            LayoutDashboard,
            "Tudo no mesmo lugar",
            "Anúncios, disponibilidade e reservas, numa área privada.",
          ],
        ].map(([Icon, title, copy]) => {
          const I = Icon as typeof Building2;
          return (
            <article key={String(title)}>
              <I />
              <h2>{String(title)}</h2>
              <p>{String(copy)}</p>
            </article>
          );
        })}
      </div>
      <p className="notice">
        Cria uma conta, confirma o teu email e apresenta o teu negócio. Todos os
        parceiros precisam de aprovação antes de publicar serviços.
      </p>
      <div className="account-links">
        <Link href="/business/candidatura" className="text-link">
          Apresentar o meu negócio →
        </Link>
        <Link href="/business/painel">
          Já sou parceiro · Acompanhar candidatura
        </Link>
      </div>
    </main>
  );
}
