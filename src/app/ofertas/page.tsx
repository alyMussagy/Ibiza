import Link from "next/link";
import { MapPin, Store, Compass } from "lucide-react";
import { createServerSupabase, hasSupabaseConfig } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Ofertas dos parceiros" };
export default async function Offers() {
  const supabase = hasSupabaseConfig() ? await createServerSupabase() : null;
  const { data: items, error } = supabase
    ? await supabase
        .from("listings")
        .select(
          "id,title,description,location,price_minor,price_unit,category,organizations!inner(approval)",
        )
        .eq("status", "published")
        .eq("organizations.approval", "approved")
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [], error: null };
  if (error) throw new Error("Não foi possível consultar as ofertas.");
  return (
    <main id="main" className="shell category-page">
      <span className="eyebrow coral">PARCEIROS IBIZA</span>
      <h1>Ofertas da nossa comunidade.</h1>
      <p className="lead">Anúncios publicados por negócios aprovados.</p>
      <p className="notice">
        Preços informativos em MZN. Reservas e pagamentos ainda não estão
        disponíveis.
      </p>
      {items?.length ? (
        <div className="info-grid">
          {items.map((i) => (
            <article key={i.id}>
              <Store className="coral" size={28} />
              <span className="status-badge">{i.category}</span>
              <h2>{i.title}</h2>
              <p>
                <MapPin size={16} aria-hidden="true" /> {i.location}
              </p>
              <p style={{ whiteSpace: "pre-wrap" }}>{i.description}</p>
              <strong>
                {(i.price_minor / 100).toLocaleString("pt-MZ")} MZN /{" "}
                {i.price_unit}
              </strong>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Store size={36} />
          <h2>As primeiras ofertas estão a caminho.</h2>
          <p>Estamos a preparar o catálogo com os parceiros locais.</p>
        </div>
      )}
      <Button asChild variant="outline">
        <Link href="/explorar">
          <Compass size={18} />
          Explorar ideias de viagem
        </Link>
      </Button>
    </main>
  );
}
export const dynamic = "force-dynamic";
