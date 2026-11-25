"use client";
import { usePathname } from "next/navigation";
import { ArrowUpRight, LogOut, ShieldCheck } from "lucide-react";
import { signOutAdmin } from "@admin/lib/actions";

export function HeaderActions({ publicUrl }: { publicUrl: string }) {
  const pathname = usePathname();
  const publicPage = pathname === "/login" || pathname === "/sem-acesso";
  return (
    <div className="admin-app-header-actions">
      {!publicPage && <span className="admin-app-private"><ShieldCheck size={16} aria-hidden="true" /> Acesso privado</span>}
      <a href={publicUrl} target="_blank" rel="noreferrer">Ver site <ArrowUpRight size={16} aria-hidden="true" /></a>
      {!publicPage && <form action={signOutAdmin}><button type="submit" className="admin-app-logout"><LogOut size={16} aria-hidden="true" /> Sair</button></form>}
    </div>
  );
}
