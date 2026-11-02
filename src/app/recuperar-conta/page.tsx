import { AuthShell } from "@/components/layout/auth-shell";
export const metadata = { title: "Recuperar conta" };
export default function Recover() {
  return (
    <AuthShell
      mode="recover"
      title="Vamos recuperar o acesso."
      description="Enviaremos uma ligação segura para o teu email."
    />
  );
}
export const dynamic = "force-dynamic";
