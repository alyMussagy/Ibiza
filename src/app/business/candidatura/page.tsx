import Link from "next/link";
import { requireUser } from "@/features/auth/session";
import { PartnerForm } from "@/components/forms/partner-form";
export const metadata = { title: "Candidatura de parceiro" };
export default async function Application() {
  const { user, supabase } = await requireUser("/business/candidatura");
  const { data: pending, error } = await supabase
    .from("partner_applications")
    .select("id")
    .eq("submitted_by", user.id)
    .eq("status", "pending")
    .limit(1);
  if (error) throw new Error("Não foi possível verificar as candidaturas.");
  return (
    <main id="main" className="shell category-page prose-page">
      <span className="eyebrow coral">IBIZA BUSINESS</span>
      <h1>Vamos conhecer o teu negócio.</h1>
      <p className="lead">
        Apresenta a tua actividade à equipa IBIZA. Todos os parceiros passam por
        aprovação manual.
      </p>
      {pending?.length ? (
        <section className="empty-state">
          <h2>A tua candidatura está em análise.</h2>
          <p>
            Já recebemos o teu pedido. Acompanha a decisão na área de parceiro.
          </p>
          <Link href="/business/painel" className="text-link">
            Ver a minha candidatura →
          </Link>
        </section>
      ) : (
        <PartnerForm email={user.email || ""} />
      )}
    </main>
  );
}
export const dynamic = "force-dynamic";
