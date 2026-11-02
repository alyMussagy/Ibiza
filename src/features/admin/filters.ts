export function adminPage(value: unknown) {
  return typeof value === "string" && /^\d{1,5}$/.test(value)
    ? Math.max(1, Math.min(10000, Number(value)))
    : 1;
}
export function adminSearch(value: unknown) {
  return typeof value === "string"
    ? value
        .replace(/[^\p{L}\p{N}\s-]/gu, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80)
    : "";
}
export function adminDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return "";
  const parsed = new Date(value + "T00:00:00Z");
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
    ? value
    : "";
}
export function afterDate(value: string) {
  return new Date(
    Date.parse(value + "T00:00:00+02:00") + 86400000,
  ).toISOString();
}
export function adminHref(
  base: string,
  filters: Record<string, string>,
  page: number,
) {
  const p = new URLSearchParams();
  for (const [key, value] of Object.entries(filters))
    if (value) p.set(key, value);
  if (page > 1) p.set("pagina", String(page));
  return base + (p.size ? "?" + p.toString() : "");
}
export const auditLabels: Record<string, string> = {
  "partner.submitted": "Candidatura enviada",
  "partner.reviewed": "Candidatura revista",
  "listing.saved": "Anúncio guardado",
  "listing.reviewed": "Anúncio revisto",
  "listing.photo_added": "Fotografia adicionada",
  "availability.created": "Disponibilidade criada",
  "availability.closed": "Período fechado",
  "reservation.requested": "Reserva solicitada",
  "reservation.confirmed": "Reserva confirmada",
  "reservation.rejected": "Pedido recusado",
  "reservation.cancelled": "Reserva cancelada",
  "reservation.completed": "Reserva concluída",
};
