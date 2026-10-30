import { z } from "zod";
export const emailSchema = z.string().trim().email().toLowerCase().max(254);
export const passwordSchema = z.string().min(12).max(128);
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  password: passwordSchema,
});
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export function safeNext(value: unknown, fallback = "/perfil") {
  return typeof value === "string" &&
    [
      "/perfil",
      "/business/candidatura",
      "/business/painel",
      "/admin/parceiros",
      "/actualizar-palavra-passe",
    ].includes(value)
    ? value
    : fallback;
}
export function appOrigin() {
  const origin = process.env.NEXT_PUBLIC_APP_URL;
  if (!origin) throw new Error("NEXT_PUBLIC_APP_URL não configurado.");
  const url = new URL(origin);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("Origem inválida.");
  return url.origin;
}
