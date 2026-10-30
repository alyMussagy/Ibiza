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
        Uma futura área de gestão para alojamentos, restaurantes, experiências e
        organizadores de eventos.
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
        Em preparação. O registo de parceiros e a autenticação fazem parte da
        Fase 2. Ainda não recolhemos candidaturas.
      </p>
      <Link href="/" className="text-link">
        Voltar à descoberta →
      </Link>
    </main>
  );
}
