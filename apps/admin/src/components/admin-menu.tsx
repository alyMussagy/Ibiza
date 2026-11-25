"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Store, CalendarDays, History } from "lucide-react";

const sections = [
  { href: "/", label: "Visão geral", Icon: LayoutDashboard },
  { href: "/parceiros", label: "Parceiros", Icon: Building2 },
  { href: "/anuncios", label: "Anúncios", Icon: Store },
  { href: "/reservas", label: "Reservas", Icon: CalendarDays },
  { href: "/auditoria", label: "Auditoria", Icon: History },
];

function PendingMark() {
  const { pending } = useLinkStatus();
  return <span className={`admin-menu-pending${pending ? " is-pending" : ""}`} aria-hidden="true" />;
}

export function AdminMenu() {
  const pathname = usePathname();
  if (!pathname || pathname === "/login" || pathname === "/sem-acesso" || pathname.startsWith("/auth/")) return null;

  return <nav className="admin-menu" aria-label="Administração IBIZA">
    <div className="shell admin-menu-inner">
      {sections.map(({ href, label, Icon }) => <Link href={href} key={href} aria-current={pathname === href ? "page" : undefined}>
        <Icon size={18} aria-hidden="true" />
        <span>{label}</span>
        <PendingMark />
      </Link>)}
    </div>
  </nav>;
}
