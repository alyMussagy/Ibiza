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
          : p.changed === "1"
            ? "Palavra-passe alterada. Entra com a nova palavra-passe."
            : undefined
      }
    />
  );
}
