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
        Explorar uma prévia visual, pesquisar exemplos e conhecer as categorias.
        Não existem ofertas comerciais activas, reservas, pagamentos ou bilhetes
        nesta versão.
      </p>
      <h2 id="privacidade">Privacidade nesta versão</h2>
      <p>
        Quando o acesso a contas estiver activado, o registo guarda o teu nome e
        email; as palavras-passe são geridas pelo Supabase Auth. As candidaturas
        guardam os dados de contacto e a descrição do negócio para análise pela
        equipa IBIZA. Os contactos empresariais só são acessíveis aos membros do
        negócio e à administração. Não recolhemos dados de pagamento. Não
        incluímos ferramentas de publicidade ou análise de visitantes. As
        pesquisas aparecem no endereço da página; evita introduzir dados
        pessoais. O servidor pode gerar registos técnicos de acesso. A política
        completa e o canal de exercício de direitos serão disponibilizados antes
        do lançamento público.
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
