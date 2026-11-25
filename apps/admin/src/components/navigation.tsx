import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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

