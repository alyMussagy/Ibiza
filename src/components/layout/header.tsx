"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { Brand } from "./brand";
import { Button } from "@/components/ui/button";
import { categories } from "@/features/listings/catalog";
export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Brand />
        <nav aria-label="Navegação principal" className="desktop-nav">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/${c.slug}`}
              aria-current={pathname === `/${c.slug}` ? "page" : undefined}
            >
              {c.label}
            </Link>
          ))}
        </nav>
        <Link className="partner-link" href="/business">
          Sou parceiro <ArrowUpRight size={16} />
        </Link>
        <Button
          variant="outline"
          size="icon"
          className="mobile-toggle"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>
      {open && (
        <nav
          id="mobile-menu"
          className="mobile-nav"
          aria-label="Navegação móvel"
        >
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/${c.slug}`}
              onClick={() => setOpen(false)}
            >
              {c.label}
            </Link>
          ))}
          <Link href="/business" onClick={() => setOpen(false)}>
            Sou parceiro
          </Link>
        </nav>
      )}
    </header>
  );
}
