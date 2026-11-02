"use client";
import { useActionState } from "react";
import { PauseCircle, PlayCircle, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { changePartnerStatus } from "@/features/partners/operations";
export function PartnerStatusForm({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const [state, action, pending] = useActionState(changePartnerStatus, {});
  return (
    <form action={action} className="account-form">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="activate" value={String(!active)} />
      <label>
        Motivo da {active ? "suspensão" : "reactivação"}
        <textarea name="reason" required minLength={5} maxLength={1000} />
      </label>
      <p>
        {active
          ? "A suspensão retira as ofertas do catálogo e impede novos pedidos. As reservas existentes continuam registadas para acompanhamento."
          : "A reactivação volta a disponibilizar as ofertas publicadas."}
      </p>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="form-success">
          {state.success}
        </p>
      )}
      <Button variant="outline" disabled={pending}>
        {pending ? (
          <LoaderCircle className="animate-spin" size={18} />
        ) : active ? (
          <PauseCircle size={18} />
        ) : (
          <PlayCircle size={18} />
        )}{" "}
        {active ? "Suspender negócio" : "Reactivar negócio"}
      </Button>
    </form>
  );
}
