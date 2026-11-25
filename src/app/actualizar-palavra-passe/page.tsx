import { AuthShell } from "@/components/layout/auth-shell";
import { requireUser } from "@/features/auth/session";
export const metadata = { title: "Nova palavra-passe" };
export default async function Update() {
  await requireUser("/actualizar-palavra-passe");
  return (
    <AuthShell
      mode="update"
      title="Uma nova palavra-passe."
      description="Depois de guardar, entra novamente na tua conta."
    />
  );
}
export const dynamic = "force-dynamic";
