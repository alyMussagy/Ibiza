"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { createClient } from "@/lib/supabase/client";
export function TeamForm({ id }: { id: string }) {
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmed = useRef(false);
  const router = useRouter();
  return (
    <>
      <form
        ref={formRef}
        className="account-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!confirmed.current) {
            setConfirmOpen(true);
            return;
          }
          confirmed.current = false;
          const f = new FormData(e.currentTarget);
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
          <FormSelect
            name="role"
            label="Acesso"
            options={[
              { value: "scanner", label: "Scanner · validar entradas" },
              {
                value: "staff",
                label: "Colaborador · consultar anúncios do negócio",
              },
              {
                value: "manager",
                label: "Gestor · anúncios, disponibilidade e reservas",
              },
              { value: "remove", label: "Remover acesso" },
            ]}
          />
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
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Actualizar o acesso da equipa?"
        description="Confirma o identificador da conta e o nível de acesso antes de aplicar esta alteração."
        confirmLabel="Actualizar acesso"
        onConfirm={() => {
          confirmed.current = true;
          formRef.current?.requestSubmit();
        }}
      />
    </>
  );
}
