import Link from "next/link";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { requireAdmin } from "@/features/auth/session";
import { ListingReviewForm } from "@/components/forms/listing-form";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Revisão de anúncios" };
export default async function ListingModeration() {
  const { supabase } = await requireAdmin();
  const { data: items, error } = await supabase
    .from("listings")
    .select("*")
    .eq("review_status", "pending")
    .order("updated_at")
    .limit(100);
  if (error)
    throw new Error("Não foi possível carregar os anúncios para revisão.");
  return (
    <main id="main" className="shell category-page">
      <span className="eyebrow coral">ADMINISTRAÇÃO</span>
      <h1>Ofertas prontas para revisão.</h1>
      <p className="lead">
        Verifica os detalhes antes de publicar. Cada decisão fica registada.
      </p>
      <Button asChild variant="outline">
        <Link href="/admin/parceiros">
          <ArrowLeft size={18} />
          Candidaturas de parceiros
        </Link>
      </Button>
      <p className="notice">
        Até 100 anúncios, dos mais antigos aos mais recentes.
      </p>
      {items?.length ? (
        <div className="info-grid">
          {items.map((i) => (
            <article key={`${i.id}:${i.revision}`}>
              <span className="status-badge">{i.category}</span>
              <h2>{i.title}</h2>
              <p>
                {i.location} · {(i.price_minor / 100).toLocaleString("pt-MZ")}{" "}
                MZN / {i.price_unit}
              </p>
              <p style={{ whiteSpace: "pre-wrap" }}>{i.description}</p>
              <ListingReviewForm id={i.id} revision={i.revision} />
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <ClipboardCheck size={36} />
          <h2>Tudo revisto por agora.</h2>
          <p>Novos anúncios enviados pelos parceiros aparecerão aqui.</p>
        </div>
      )}
    </main>
  );
}
export const dynamic = "force-dynamic";
