"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Headset, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { createClient } from "@/lib/supabase/client";
export function ReservationSupport({ id }: { id: string }) {
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmed = useRef(false);
  const router = useRouter();
  return (
    <>
      <details className="account-card">
        <summary>Suporte administrativo</summary>
        <form
          ref={formRef}
          className="account-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const cancel = f.get("decision") === "cancel";
            if (cancel && !confirmed.current) {
              setConfirmOpen(true);
              return;
            }
            confirmed.current = false;
            setPending(true);
            try {
              const { error } = await createClient().rpc(
                "support_reservation",
                {
                  target_reservation: id,
                  cancel_booking: cancel,
                  reason: f.get("reason"),
                },
              );
              setMessage(
                error
                  ? "Não foi possível concluir. Verifica o estado da reserva e as permissões."
                  : "Intervenção registada na auditoria.",
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
            Intervenção
            <FormSelect
              name="decision"
              label="Intervenção"
              options={[
                { value: "note", label: "Registar nota interna" },
                { value: "cancel", label: "Cancelar reserva" },
              ]}
            />
          </label>
          <label>
            Motivo
            <textarea name="reason" minLength={5} maxLength={1000} required />
          </label>
          <Button disabled={pending}>
            {pending ? (
              <LoaderCircle className="animate-spin" size={18} />
            ) : (
              <Headset size={18} />
            )}
            Registar intervenção
          </Button>
          {message && (
            <p role="status" className="notice">
              {message}
            </p>
          )}
        </form>
      </details>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Cancelar esta reserva?"
        description="O cliente e o parceiro receberão um aviso dentro do IBIZA. Esta decisão fica registada na auditoria."
        confirmLabel="Cancelar reserva"
        onConfirm={() => {
          confirmed.current = true;
          formRef.current?.requestSubmit();
        }}
      />
    </>
  );
}
