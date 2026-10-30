import { Search, MapPin } from "lucide-react";
import { categories } from "@/features/listings/catalog";
import { Button } from "@/components/ui/button";
export function SearchForm({
  query = "",
  category = "",
}: {
  query?: string;
  category?: string;
}) {
  return (
    <form action="/explorar" className="search-form" role="search">
      <div className="search-place">
        <MapPin size={20} aria-hidden="true" />
        <label htmlFor="search-place">
          <span>Para onde vamos?</span>
          <input
            id="search-place"
            type="search"
            name="q"
            placeholder="Tofo, Barra, Vilanculos…"
            defaultValue={query}
            maxLength={100}
          />
        </label>
      </div>
      <label className="search-category" htmlFor="search-category">
        <span>O que queres descobrir?</span>
        <select id="search-category" name="categoria" defaultValue={category}>
          <option value="">Todas as experiências</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit">
        <Search size={18} />
        Explorar
      </Button>
    </form>
  );
}
