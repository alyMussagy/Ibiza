import { requireUser } from "@/features/auth/session";
import { PartnerForm } from "@/components/forms/partner-form";
export const metadata = { title: "Candidatura de parceiro" };
export default async function Application() {
  const { user } = await requireUser("/business/candidatura");
  return (
    <main id="main" className="shell category-page prose-page">
      <span className="eyebrow coral">IBIZA BUSINESS</span>
      <h1>Vamos conhecer o teu negócio.</h1>
      <p className="lead">
        Apresenta a tua actividade à equipa IBIZA. Todos os parceiros passam por
        aprovação manual.
      </p>
      <PartnerForm email={user.email || ""} />
    </main>
  );
}
export const dynamic = "force-dynamic";
