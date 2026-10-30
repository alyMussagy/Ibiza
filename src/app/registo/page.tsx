import { AuthShell } from "@/components/layout/auth-shell";
export const metadata = { title: "Criar conta" };
export default function Register() {
  return (
    <AuthShell
      mode="register"
      title="A tua viagem começa aqui."
      description="Cria uma conta e confirma o teu email para activar o acesso."
    />
  );
}
export const dynamic = "force-dynamic";
