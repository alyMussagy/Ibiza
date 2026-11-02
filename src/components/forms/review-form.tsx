"use client";
import { ShieldCheck, LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { reviewPartner } from "@/features/partners/actions";
import { Button } from "@/components/ui/button";
export function ReviewForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(reviewPartner, {});
  return (
    <form action={action} className="account-form">
      <input type="hidden" name="applicationId" value={id} />
      <label>
        Decisão
        <select name="decision" required>
          <option value="">Selecciona</option>
          <option value="approved">Aprovar parceiro</option>
          <option value="rejected">Não aprovar</option>
        </select>
      </label>
      <label>
        Justificação (visível ao candidato)
        <textarea
          name="reason"
          required
          minLength={5}
          maxLength={1000}
          rows={3}
        />
      </label>
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
      <Button type="submit" disabled={pending || Boolean(state.success)}>
        {pending ? (
          <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
        ) : (
          <ShieldCheck size={18} aria-hidden="true" />
        )}
        {pending ? "A registar…" : "Registar decisão"}
      </Button>
    </form>
  );
}
