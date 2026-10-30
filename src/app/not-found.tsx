import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="shell category-page">
      <span className="eyebrow coral">404</span>
      <h1>Este caminho ainda não existe.</h1>
      <Link href="/" className="text-link">
        Voltar ao início →
      </Link>
    </main>
  );
}
