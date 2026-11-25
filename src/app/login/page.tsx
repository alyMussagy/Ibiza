import { AuthShell } from "@/components/layout/auth-shell";
import { safeNext } from "@/features/auth/validation";
export const metadata = { title: "Entrar" };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; notice?: string; changed?: string }>;
}) {
  const p = await searchParams;
  return (
    <AuthShell
      mode="login"
      title="Que bom ter-te de volta."
      description="Entra na tua conta para continuar."
      next={safeNext(p.next)}
      notice={
        p.notice === "invalid-link"
          ? "Esta ligação é inválida ou expirou. Solicita uma nova ligação de recuperação."
          : p.notice === "google-unavailable"
            ? "A entrada com Google está temporariamente indisponível. Tenta com email e palavra-passe."
            : p.notice === "google-cancelled"
              ? "A entrada com Google não foi concluída. Podes tentar novamente."
          : p.changed === "1"
            ? "Palavra-passe alterada. Entra com a nova palavra-passe."
            : undefined
      }
    />
  );
}

