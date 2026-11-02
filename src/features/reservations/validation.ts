import { z } from "zod";
export function maputoDate(value: string) {
  const ms = Date.parse(value + "+02:00");
  if (
    !Number.isFinite(ms) ||
    new Date(ms + 7200000).toISOString().slice(0, 16) !== value
  )
    return null;
  return new Date(ms).toISOString();
}
export const slotSchema = z.object({
  listingId: z.uuid(),
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  capacity: z.coerce.number().int().min(1).max(10000),
  price: z
    .string()
    .regex(/^\d{1,7}([.,]\d{1,2})?$/)
    .transform((v) => Math.round(Number(v.replace(",", ".")) * 100))
    .pipe(z.number().int().min(0).max(100000000)),
});
export const requestSchema = z.object({
  slotId: z.uuid(),
  quantity: z.coerce.number().int().min(1).max(20),
  note: z.string().trim().max(1000),
  requestKey: z.uuid(),
});
export const decisionSchema = z.object({
  reservationId: z.uuid(),
  decision: z.enum(["confirmed", "rejected", "cancelled", "completed"]),
  reason: z.string().trim().min(3).max(1000),
});
export function reservationStatus(status: string, expiresAt: string) {
  return status === "pending" && new Date(expiresAt).getTime() <= Date.now()
    ? "expired"
    : status;
}
export const reservationLabels: Record<string, string> = {
  pending: "À espera do parceiro",
  confirmed: "Confirmada",
  rejected: "Recusada",
  cancelled: "Cancelada",
  completed: "Concluída",
  expired: "Pedido expirado",
};
export function formatPeriod(value: string) {
  return new Intl.DateTimeFormat("pt-MZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Maputo",
  }).format(new Date(value));
}
