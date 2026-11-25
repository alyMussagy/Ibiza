"use client";
import { useActionState, useState } from "react";
import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signInAdmin } from "@admin/lib/actions";

export function AdminLoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signInAdmin, {});
  const [visible, setVisible] = useState(false);
  return (
    <form action={action} className="account-form">
      <input type="hidden" name="next" value={next} />
      <label>Email<input name="email" type="email" autoComplete="username" required /></label>
      <label>Palavra-passe
        <span className="password-control">
          <input name="password" type={visible ? "text" : "password"} autoComplete="current-password" required />
          <button type="button" className="password-toggle" onClick={() => setVisible(!visible)} aria-label={visible ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}>
            {visible ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        </span>
      </label>
      {state.error && <p role="alert" className="form-error">{state.error}</p>}
      <Button disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" size={18} /> : <LogIn size={18} />}
        Entrar no painel
      </Button>
    </form>
  );
}
