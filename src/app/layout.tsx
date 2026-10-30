import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
export const metadata: Metadata = {
  title: {
    default: "IBIZA — Descobre. Reserva. Vive.",
    template: "%s | IBIZA",
  },
  description:
    "Descobre uma nova forma de viver Inhambane. Destinos, estadias, eventos, sabores e experiências. Prévia de demonstração.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-MZ">
      <body>
        <a href="#main" className="skip-link">
          Saltar para o conteúdo
        </a>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
