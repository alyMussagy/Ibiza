"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main" className="shell category-page">
      <h1>Algo não correu como esperávamos.</h1>
      <p>Tenta novamente dentro de momentos.</p>
      <Button onClick={reset}>Tentar novamente</Button>
    </main>
  );
}
