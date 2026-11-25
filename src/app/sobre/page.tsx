import Link from "next/link";
export const metadata = { title: "Sobre o projecto" };
export default function About() {
  return (
    <main id="main" className="shell category-page prose-page">
      <span className="eyebrow coral">DESCOBRE. RESERVA. VIVE.</span>
      <h1>Uma nova forma de descobrir Inhambane.</h1>
      <p className="lead">
        O IBIZA está a preparar um marketplace de turismo e entretenimento,
        começando por Inhambane, Moçambique.
      </p>
      <h2>O que podes fazer agora</h2>
      <p>
        Explorar destinos e categorias, criar uma conta e conhecer as ofertas
        publicadas. As opções de reserva dependem da disponibilidade de cada
        parceiro. Algumas páginas ainda apresentam conteúdo ilustrativo.
      </p>
      <h2 id="privacidade">Privacidade nesta versão</h2>
      <p>
        Consulta a nossa <Link href="/privacidade">página de privacidade</Link>
        para saberes que dados usamos, como funciona a entrada com Google e
        como nos contactar.
      </p>
      <h2>Fotografia e redes sociais</h2>
      <p>
        As fotografias são ilustrativas e não certificam a localização ou
        existência de serviços. A proveniência encontra-se na documentação do
        projecto. As ligações aos perfis oficiais das redes sociais serão
        adicionadas quando forem fornecidas.
      </p>
    </main>
  );
}
