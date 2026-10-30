"use client";
import { useActionState } from "react";
import { authAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
export type AuthMode = "login" | "register" | "recover" | "update";
export function AuthForm({
  mode,
  enabled,
  next = "/perfil",
}: {
  mode: AuthMode;
  enabled: boolean;
  next?: string;
}) {
  const [state, action, pending] = useActionState(authAction, {});
  return (
    <form action={action} className="account-form">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="next" value={next} />
      {mode === "register" && (
        <label>
          O teu nome
          <input
            name="name"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
          />
        </label>
      )}
      {mode !== "update" && (
        <label>
          Email
          <input
            type="email"
            name="email"
            required
            maxLength={254}
            autoComplete="email"
          />
        </label>
      )}
      {mode !== "recover" && (
        <label>
          {mode === "update" ? "Nova palavra-passe" : "Palavra-passe"}
          <input
            type="password"
            name="password"
            required
            minLength={mode === "login" ? 1 : 12}
            maxLength={128}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
          />
          {mode !== "login" && (
            <small>
              Pelo menos 12 caracteres. Usa uma palavra-passe única.
            </small>
          )}
        </label>
      )}
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
      <Button type="submit" disabled={!enabled || pending}>
        {pending
          ? "A processar…"
          : {
              login: "Entrar",
              register: "Criar conta",
              recover: "Enviar ligação",
              update: "Guardar nova palavra-passe",
            }[mode]}
      </Button>
    </form>
  );
}
