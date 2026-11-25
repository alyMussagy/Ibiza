import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource-variable/inter";
import "../../../../src/app/globals.css";
import "./admin.css";
import { HeaderActions } from "@admin/components/header-actions";

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
            <span className="admin-app-brand-mark">IBIZA</span>
            <span className="admin-app-brand-divider" aria-hidden="true" />
            <span>Operação</span>
          </Link>
          <HeaderActions publicUrl={process.env.NEXT_PUBLIC_PUBLIC_APP_URL || "https://ibiza-mz.vercel.app"} />
        </header>
        {children}
      </body>
    </html>
  );
}
