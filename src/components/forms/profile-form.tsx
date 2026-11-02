"use client";
import { useActionState } from "react";
import { updateProfile } from "@/features/auth/profile-actions";
import { Button } from "@/components/ui/button";
export function ProfileForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateProfile, {});
  return (
    <form action={action} className="account-form profile-form">
      <label>
        Nome de apresentação
        <input
          name="name"
          defaultValue={name}
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
        />
      </label>
      <p className="journey-note">Este é o nome usado na tua conta IBIZA.</p>
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
      <Button type="submit" disabled={pending}>
        {pending ? "A guardar…" : "Guardar nome"}
      </Button>
    </form>
  );
}
