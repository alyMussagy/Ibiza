"use client";
import {
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Mail,
  LockKeyhole,
  LoaderCircle,
} from "lucide-react";
import { useActionState, useState, useId } from "react";
import { authAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
export type AuthMode = "login" | "register" | "recover" | "update";
export function AuthForm({
  mode,
  enabled,
  next = "/comecar",
}: {
  mode: AuthMode;
  enabled: boolean;
  next?: string;
}) {
  const ActionIcon = {
    login: LogIn,
    register: UserPlus,
    recover: Mail,
    update: LockKeyhole,
  }[mode];
  const [visible, setVisible] = useState(false);
  const passwordId = useId();
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
        <div className="password-field">
          <label htmlFor={passwordId}>
            {mode === "update" ? "Nova palavra-passe" : "Palavra-passe"}
          </label>
          <div className="password-control">
            <input
              id={passwordId}
              type={visible ? "text" : "password"}
              name="password"
              required
              minLength={mode === "login" ? 1 : 12}
              maxLength={128}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
            <button
              type="button"
              className="password-toggle"
              aria-label={
                visible ? "Ocultar palavra-passe" : "Mostrar palavra-passe"
              }
              aria-controls={passwordId}
              aria-pressed={visible}
              onClick={() => setVisible((v) => !v)}
            >
              {visible ? (
                <EyeOff size={20} aria-hidden="true" />
              ) : (
                <Eye size={20} aria-hidden="true" />
              )}
            </button>
          </div>
          {mode !== "login" && (
            <small>
              Pelo menos 12 caracteres. Usa uma palavra-passe única.
            </small>
          )}
        </div>
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
        {pending ? (
          <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
        ) : (
          <ActionIcon size={18} aria-hidden="true" />
        )}
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
