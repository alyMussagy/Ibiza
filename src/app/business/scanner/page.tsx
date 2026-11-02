import { requireUser } from "@/features/auth/session";
import { TicketScanner } from "@/components/forms/ticket-scanner";
export default async function Scanner() {
  const { supabase, user } = await requireUser("/business/scanner");
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("profile_id", user.id)
    .in("role", ["owner", "manager", "scanner"])
    .limit(1);
  if (error) throw new Error("Não foi possível verificar a equipa.");
  return (
    <main id="main" className="shell category-page">
      <span className="eyebrow coral">CONTROLO DE ENTRADAS</span>
      <h1>Scanner IBIZA.</h1>
      {data?.length ? (
        <TicketScanner />
      ) : (
        <p className="notice">
          O proprietário do negócio precisa de te adicionar à equipa de
          entradas.
        </p>
      )}
    </main>
  );
}
export const dynamic = "force-dynamic";
