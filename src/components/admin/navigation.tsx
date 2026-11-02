import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  Store,
  CalendarDays,
  History,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
const sections = [
  { href: "/admin", label: "Visão geral", Icon: LayoutDashboard },
  { href: "/admin/parceiros", label: "Parceiros", Icon: Building2 },
  { href: "/admin/anuncios", label: "Anúncios", Icon: Store },
  { href: "/admin/reservas", label: "Reservas", Icon: CalendarDays },
  { href: "/admin/auditoria", label: "Auditoria", Icon: History },
];
export function AdminNav({ current }: { current: string }) {
  return (
    <nav className="admin-navigation" aria-label="Administração IBIZA">
      {sections.map(({ href, label, Icon }) => (
        <Button
          key={href}
          asChild
          variant={current === href ? "default" : "outline"}
        >
          <Link
            href={href}
            aria-current={current === href ? "page" : undefined}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </Link>
        </Button>
      ))}
    </nav>
  );
}
export function AdminPagination({
  page,
  count,
  href,
}: {
  page: number;
  count: number;
  href: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(count / 20));
  return (
    <nav className="offer-pagination" aria-label="Paginação">
      {page > 1 && (
        <Button asChild variant="outline">
          <Link href={href(page - 1)}>
            <ArrowLeft size={18} />
            Anterior
          </Link>
        </Button>
      )}
      <span>
        Página {page} · {count} registos
      </span>
      {page < pages && (
        <Button asChild variant="outline">
          <Link href={href(page + 1)}>
            Seguinte
            <ArrowRight size={18} />
          </Link>
        </Button>
      )}
    </nav>
  );
}
