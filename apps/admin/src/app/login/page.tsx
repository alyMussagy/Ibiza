import { ShieldCheck } from "lucide-react";
import { AdminLoginForm } from "@admin/components/login-form";
import { adminNext } from "@admin/lib/auth";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main id="main" className="shell admin-login-wrap">
      <div className="admin-login-copy">
        <span className="eyebrow coral">IBIZA · CENTRO DE OPERAÇÕES</span>
        <h1>Onde o IBIZA ganha vida.</h1>
        <span className="admin-login-accent" aria-hidden="true" />
        <p>Parceiros, anúncios, reservas e decisões da plataforma num espaço reservado à equipa.</p>
      </div>
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <ShieldCheck size={28} color="#ed3153" aria-hidden="true" />
        <h2 id="admin-login-title">Acesso à administração</h2>
        <p>Entra com a conta administradora do IBIZA.</p>
        <AdminLoginForm next={adminNext(next)} />
      </section>
    </main>
  );
}
