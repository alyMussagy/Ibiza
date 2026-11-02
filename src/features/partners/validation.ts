import { z } from "zod";
export const partnerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  businessType: z.enum(["estadias", "eventos", "restaurantes", "experiencias"]),
  email: z.string().trim().email().max(254),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d ()-]{7,30}$/),
  location: z.string().trim().min(2).max(160),
  description: z.string().trim().min(20).max(2000),
});
export const reviewSchema = z.object({
  applicationId: z.uuid(),
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().trim().min(5).max(1000),
});
export const statusLabels: Record<string, string> = {
  pending: "Em análise",
  approved: "Aprovado",
  rejected: "Não aprovado",
  suspended: "Suspenso",
};
