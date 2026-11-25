import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import "@fontsource-variable/inter";
import "../../../../src/app/globals.css";
import "./admin.css";
import { HeaderActions } from "@admin/components/header-actions";
import { AdminMenu } from "@admin/components/admin-menu";

export const metadata: Metadata = {
  title: { default: "Operação | IBIZA", template: "%s | Operação IBIZA" },
  description: "Painel privado de operação do IBIZA.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-MZ">
      <body className="admin-app">
        <a href="#main" className="skip-link">Saltar para o conteúdo</a>
        <header className="admin-app-header">
          <Link href="/" className="admin-app-brand" aria-label="IBIZA Operação — início">
            <Image src="https://ibiza-mz.vercel.app/brand/ibiza-oficial.png" alt="IBIZA" width={1774} height={887} className="admin-app-brand-mark" priority />
            <span className="admin-app-brand-divider" aria-hidden="true" />
            <span>Operação</span>
          </Link>
          <HeaderActions publicUrl={process.env.NEXT_PUBLIC_PUBLIC_APP_URL || "https://ibiza-mz.vercel.app"} />
        </header>
        <AdminMenu />
        {children}
      </body>
    </html>
  );
}
