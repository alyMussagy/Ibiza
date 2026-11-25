import { z } from "zod";
export const listingSchema = z.object({
  id: z.union([z.uuid(), z.literal("")]),
  organizationId: z.uuid(),
  revision: z.coerce.number().int().positive(),
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(30).max(5000),
  category: z.enum([
    "estadias",
    "eventos",
    "restaurantes",
    "experiencias",
    "destinos",
  ]),
  location: z.string().trim().min(2).max(120),
  price: z
    .string()
    .regex(/^\d{1,7}([.,]\d{1,2})?$/)
    .transform((v) => Math.round(Number(v.replace(",", ".")) * 100))
    .pipe(z.number().int().min(0).max(100000000)),
  unit: z.enum(["pessoa", "noite", "entrada", "mesa", "grupo"]),
  intent: z.enum(["draft", "submit"]),
});
export const listingReviewSchema = z.object({
  id: z.uuid(),
  revision: z.coerce.number().int().positive(),
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().trim().min(5).max(1000),
});
export const reviewLabels: Record<string, string> = {
  draft: "Rascunho",
  pending: "Em análise",
  approved: "Publicado",
  rejected: "Precisa de ajustes",
};
