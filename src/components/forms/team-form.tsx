"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
export function TeamForm({ id }: { id: string }) {
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <form
      className="account-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        if (
          !window.confirm(
            "Aplicar este acesso ao colaborador indicado? Confirma o identificador antes de continuar.",
          )
        )
          return;
        setPending(true);
        try {
          const { error } = await createClient().rpc("manage_team", {
            target_org: id,
            member_id: f.get("member"),
            member_role: f.get("role"),
          });
          setMessage(
            error
              ? "Não foi possível alterar. Confirma a conta, a aprovação do negócio e as permissões."
              : "Acesso da equipa actualizado.",
          );
          router.refresh();
        } catch {
          setMessage("Falha de ligação. Tenta novamente.");
        } finally {
          setPending(false);
        }
      }}
    >
      <label>
        Identificador da conta do colaborador
        <input name="member" required pattern="[0-9a-fA-F-]{36}" />
      </label>
      <label>
        Acesso
        <select name="role">
          <option value="scanner">Scanner · validar entradas</option>
          <option value="staff">
            Colaborador · consultar anúncios do negócio
          </option>
          <option value="manager">
            Gestor · anúncios, disponibilidade e reservas
          </option>
          <option value="remove">Remover acesso</option>
        </select>
      </label>
      <Button disabled={pending}>
        {pending ? (
          <LoaderCircle className="animate-spin" size={18} />
        ) : (
          <Users size={18} />
        )}
        Actualizar equipa
      </Button>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </form>
  );
}
