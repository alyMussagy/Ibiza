import Link from "next/link";
import { Plus, ArrowLeft, Pencil, Store } from "lucide-react";
import { requireUser } from "@/features/auth/session";
import { ListingForm } from "@/components/forms/listing-form";
import { reviewLabels } from "@/features/listings/validation";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Os meus anúncios" };
export default async function Listings({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string; novo?: string; guardado?: string }>;
}) {
  const { supabase, user } = await requireUser("/business/anuncios");
  const p = await searchParams;
  const { data: members, error: memberError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .in("role", ["owner", "manager"]);
  if (memberError) throw new Error("Não foi possível consultar os negócios.");
  const ids = (members ?? []).map((m) => m.organization_id);
  const { data: orgs, error: orgError } = ids.length
    ? await supabase
        .from("organizations")
        .select("id,name")
        .in("id", ids)
        .eq("approval", "approved")
    : { data: [], error: null };
  const { data: items, error } = ids.length
    ? await supabase
        .from("listings")
        .select("*")
        .in("organization_id", ids)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [], error: null };
  if (error || orgError)
    throw new Error("Não foi possível consultar os anúncios.");
  const editing = items?.find((i) => i.id === p.editar);
  const editor = p.novo === "1" || Boolean(editing);
  return (
    <main id="main" className="shell category-page">
      <span className="eyebrow coral">IBIZA BUSINESS</span>
      <h1>Os teus anúncios.</h1>
      <p className="lead">Prepara a tua oferta e envia-a à equipa IBIZA.</p>
      <div className="account-links">
        <Button asChild variant="outline">
          <Link href="/business/painel">
            <ArrowLeft size={18} />
            Área de parceiro
          </Link>
        </Button>
        {!!orgs?.length && (
          <Button asChild>
            <Link href="/business/anuncios?novo=1">
              <Plus size={18} />
              Novo anúncio
            </Link>
          </Button>
        )}
      </div>
      {p.guardado === "1" && (
        <p role="status" className="form-success">
          Anúncio guardado.
        </p>
      )}
      {!orgs?.length ? (
        <div className="empty-state">
          <Store size={36} />
          <h2>Precisas de um negócio aprovado.</h2>
          <p>
            A criação de anúncios está disponível para proprietários e gestores
            de parceiros aprovados.
          </p>
          <Button asChild>
            <Link href="/business/candidatura">
              <Plus size={18} />
              Apresentar negócio
            </Link>
          </Button>
        </div>
      ) : editor ? (
        <section className="account-card">
          <h2>{editing ? "Editar anúncio" : "Criar anúncio"}</h2>
          <ListingForm
            key={editing?.id ?? "new"}
            organizations={orgs}
            item={editing}
          />
        </section>
      ) : (
        <>
          <p className="notice">
            Até 100 anúncios mais recentes. Só anúncios aprovados ficam visíveis
            no catálogo.
          </p>
          <div className="info-grid">
            {items?.map((i) => (
              <article key={i.id}>
                <span className="status-badge">
                  {reviewLabels[i.review_status]}
                </span>
                <h2>{i.title}</h2>
                <p>
                  {i.location} · {(i.price_minor / 100).toLocaleString("pt-MZ")}{" "}
                  MZN / {i.price_unit}
                </p>
                {i.review_notes && <p>Nota da equipa: {i.review_notes}</p>}
                <Button asChild variant="outline">
                  <Link href={`/business/anuncios?editar=${i.id}`}>
                    <Pencil size={18} />
                    Editar anúncio
                  </Link>
                </Button>
              </article>
            ))}
          </div>
          {!items?.length && (
            <div className="empty-state">
              <h2>A tua primeira oferta começa aqui.</h2>
              <p>
                Cria um anúncio com uma descrição clara e um preço de
                referência.
              </p>
            </div>
          )}
        </>
      )}
    </main>
  );
}
export const dynamic = "force-dynamic";
