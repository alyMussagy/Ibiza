"use server";
import { redirect } from "next/navigation";
import { createServerSupabase, hasSupabaseConfig } from "@/lib/supabase/server";
import {
  appOrigin,
  emailSchema,
  loginSchema,
  passwordSchema,
  registerSchema,
  safeNext,
} from "./validation";
export type FormState = { error?: string; success?: string };
export async function authAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  if (!hasSupabaseConfig())
    return {
      error:
        "Estamos a preparar a ligação de contas. Tenta novamente mais tarde.",
    };
  const mode = form.get("mode");
  let destination: string | undefined;
  try {
    const supabase = await createServerSupabase(true);
    if (mode === "login") {
      const parsed = loginSchema.safeParse(Object.fromEntries(form));
      if (!parsed.success)
        return { error: "Introduz um email válido e a palavra-passe." };
      const { data, error } = await supabase.auth.signInWithPassword(
        parsed.data,
      );
      if (error || !data.user?.email_confirmed_at) {
        if (data.session) await supabase.auth.signOut();
        return {
          error:
            "Não foi possível entrar. Verifica os dados e a confirmação do email.",
        };
      }
      destination = safeNext(form.get("next"));
    } else if (mode === "register") {
      const parsed = registerSchema.safeParse(Object.fromEntries(form));
      if (!parsed.success)
        return {
          error:
            "Preenche o nome, um email válido e uma palavra-passe de 12 a 128 caracteres.",
        };
      const { name, email, password } = parsed.data;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name },
          emailRedirectTo: `${appOrigin()}/auth/callback`,
        },
      });
      if (error)
        return {
          error:
            "Não foi possível concluir o pedido. Tenta mais tarde ou recupera a conta.",
        };
      return {
        success:
          "Se o endereço puder ser registado, receberás um email de confirmação. Verifica também o spam.",
      };
    } else if (mode === "recover") {
      const parsed = emailSchema.safeParse(form.get("email"));
      if (!parsed.success) return { error: "Introduz um email válido." };
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${appOrigin()}/auth/callback?next=/actualizar-palavra-passe`,
      });
      if (error)
        return {
          error:
            "Não foi possível enviar o pedido. Aguarda alguns minutos e tenta novamente.",
        };
      return {
        success:
          "Se existir uma conta com este endereço, receberás uma ligação para recuperar o acesso.",
      };
    } else if (mode === "update") {
      const parsed = passwordSchema.safeParse(form.get("password"));
      if (!parsed.success)
        return { error: "Usa uma palavra-passe de 12 a 128 caracteres." };
      const {
        data: { user },
        error: identityError,
      } = await supabase.auth.getUser();
      if (identityError || !user)
        return {
          error: "A sessão expirou. Solicita uma nova ligação de recuperação.",
        };
      const { error } = await supabase.auth.updateUser({
        password: parsed.data,
      });
      if (error)
        return {
          error:
            "Não foi possível alterar a palavra-passe. Solicita uma nova ligação ou tenta uma palavra-passe diferente.",
        };
      const { error: logoutError } = await supabase.auth.signOut({
        scope: "global",
      });
      if (logoutError)
        return {
          success:
            "Palavra-passe alterada. Não foi possível terminar todas as sessões; tenta terminar sessão novamente.",
        };
      destination = "/login?changed=1";
    } else return { error: "Pedido inválido." };
  } catch {
    return {
      error:
        "O serviço de contas está temporariamente indisponível. Tenta novamente mais tarde.",
    };
  }
  if (destination) redirect(destination);
  return {};
}
export async function logoutAction() {
  if (hasSupabaseConfig()) {
    const supabase = await createServerSupabase(true);
    const { error } = await supabase.auth.signOut();
    if (error) redirect("/perfil?notice=logout-failed");
  }
  redirect("/login");
}
