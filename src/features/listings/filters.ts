import { categories } from "./catalog";
export const offerPageSize = 12;
export type OfferParams = {
  q?: string;
  categoria?: string;
  local?: string;
  maximo?: string;
  ordem?: string;
  pagina?: string;
};
function clean(value: unknown) {
  return typeof value === "string"
    ? value
        .normalize("NFC")
        .replace(/[^\p{L}\p{N}\s-]/gu, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80)
    : "";
}
export function offerFilters(p: OfferParams) {
  const maximum =
    typeof p.maximo === "string" && /^\d{1,7}([.,]\d{1,2})?$/.test(p.maximo)
      ? Math.round(Number(p.maximo.replace(",", ".")) * 100)
      : null;
  return {
    q: clean(p.q),
    category: categories.some((c) => c.slug === p.categoria)
      ? p.categoria!
      : "",
    location: clean(p.local),
    maximum: maximum !== null && maximum <= 100000000 ? maximum : null,
    order:
      p.ordem === "preco_asc" || p.ordem === "preco_desc"
        ? p.ordem
        : "recentes",
    page:
      typeof p.pagina === "string" && /^\d{1,5}$/.test(p.pagina)
        ? Math.max(1, Math.min(10000, Number(p.pagina)))
        : 1,
  };
}
export function offersHref(f: ReturnType<typeof offerFilters>, page: number) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.category) p.set("categoria", f.category);
  if (f.location) p.set("local", f.location);
  if (f.maximum !== null) p.set("maximo", String(f.maximum / 100));
  if (f.order !== "recentes") p.set("ordem", f.order);
  if (page > 1) p.set("pagina", String(page));
  return `/ofertas${p.size ? "?" + p.toString() : ""}`;
}
