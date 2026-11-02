import Link from "next/link";
import { Bell, ArrowUpRight, CheckCheck } from "lucide-react";
import { requireUser } from "@/features/auth/session";
import { Button } from "@/components/ui/button";
import { markRead } from "./actions";
export const metadata = { title: "Notificações" };
export default async function Notifications() {
  const { supabase } = await requireUser("/notificacoes");
  const { data, error } = await supabase
    .from("notifications")
    .select("id,title,body,href,read_at,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Não foi possível carregar as notificações.");
  return (
    <main id="main" className="shell category-page">
      <span className="eyebrow coral">A TUA ACTIVIDADE</span>
      <h1>Notificações.</h1>
      <p className="lead">
        Pedidos, confirmações e alterações às reservas. Os 100 avisos mais
        recentes.
      </p>
      <div className="admin-applications">
        {!data?.length && (
          <div className="empty-state">
            <Bell size={32} />
            <h2>Tudo em dia.</h2>
            <p>Os próximos avisos aparecem aqui.</p>
          </div>
        )}
        {data?.map((n) => (
          <article key={n.id} className="account-panel">
            <span className="status-badge">{n.read_at ? "Lida" : "Nova"}</span>
            <h2>{n.title}</h2>
            <p>{n.body}</p>
            <time dateTime={n.created_at}>
              {new Intl.DateTimeFormat("pt-MZ", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Africa/Maputo",
              }).format(new Date(n.created_at))}
            </time>
            <div className="account-links">
              <Button asChild variant="outline">
                <Link href={n.href}>
                  <ArrowUpRight size={18} />
                  Ver reservas
                </Link>
              </Button>
              {!n.read_at && (
                <form action={markRead}>
                  <input type="hidden" name="id" value={n.id} />
                  <Button variant="outline">
                    <CheckCheck size={18} />
                    Marcar como lida
                  </Button>
                </form>
              )}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
export const dynamic = "force-dynamic";
