"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Headset, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
export function ReservationSupport({ id }: { id: string }) {
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <details className="account-card">
      <summary>Suporte administrativo</summary>
      <form
        className="account-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const cancel = f.get("decision") === "cancel";
          if (
            cancel &&
            !window.confirm(
              "Cancelar esta reserva? O cliente e o parceiro serão avisados dentro do IBIZA.",
            )
          )
            return;
          setPending(true);
          try {
            const { error } = await createClient().rpc("support_reservation", {
              target_reservation: id,
              cancel_booking: cancel,
              reason: f.get("reason"),
            });
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
          <select name="decision">
            <option value="note">Registar nota interna</option>
            <option value="cancel">Cancelar reserva</option>
          </select>
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
  );
}
