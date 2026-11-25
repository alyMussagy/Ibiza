import Link from "next/link";

export const metadata = { title: "Privacidade" };

export default function Privacy() {
  return (
    <main id="main" className="shell category-page prose-page privacy-page">
      <span className="eyebrow coral">IBIZA · OS TEUS DADOS</span>
      <h1>Privacidade, sem letras pequenas.</h1>
      <p className="lead">
        Esta página explica os dados usados pelo IBIZA nesta fase de
        pré-lançamento. Última actualização: 25 de novembro de 2026.
      </p>

      <h2>Quem cuida dos dados</h2>
      <p>
        O IBIZA é um projecto de turismo e entretenimento em pré-lançamento em
        Moçambique. Para questões sobre dados pessoais, pedidos de acesso,
        correcção ou eliminação, escreve para{" "}
        <a href="mailto:ibraimoalymussagy01@gmail.com">
          ibraimoalymussagy01@gmail.com
        </a>
        .
      </p>

      <h2>Dados da conta e entrada com Google</h2>
      <p>
        Ao criares uma conta por email, guardamos o teu email e nome de
        apresentação. As palavras-passe e sessões são geridas pelo Supabase
        Auth. Se escolheres Google, recebemos o email, o nome e a imagem de
        perfil que a Google disponibilizar para confirmar a tua identidade e
        criar ou associar a tua conta. Esses dados de identidade podem ficar
        guardados nos registos de autenticação do Supabase. O IBIZA não pede
        acesso ao Gmail, contactos, Drive ou outros ficheiros da tua Conta
        Google. Podes revogar a ligação nas definições da tua Conta Google.
      </p>

      <h2>Como usamos os dados na plataforma</h2>
      <p>
        Guardamos os favoritos que seleccionares e, quando pedires uma reserva,
        os dados necessários para a gerir: oferta, datas, quantidade, nome,
        nota que escreveres, estado do pedido e bilhetes emitidos. O parceiro
        responsável pela oferta pode consultar os dados do pedido para o
        atender. Se candidatares um negócio, guardamos os contactos, a
        descrição, as fotografias publicadas e os dados da equipa necessários
        para analisar e operar os anúncios. A administração pode consultar
        esses dados para moderação e suporte. Registamos acções operacionais
        para segurança e auditoria.
      </p>

      <h2>Comunicações e tecnologia</h2>
      <p>
        Enviamos emails de confirmação e recuperação de conta pelo Supabase.
        Avisos sobre reservas aparecem na tua área do IBIZA; o envio de avisos
        por email depende da configuração do serviço de correio. Usamos cookies
        necessários para manter a sessão e concluir o login com Google. A
        aplicação é alojada na Vercel e usa o Supabase para autenticação,
        armazenamento e base de dados. Estes fornecedores podem tratar dados
        fora de Moçambique. O servidor e os fornecedores podem conservar
        registos técnicos de acesso e segurança. Para compreender como o IBIZA
        é encontrado, contamos sessões no próprio site e guardamos o canal de
        origem, a campanha quando indicada na ligação, a primeira página e o
        tipo de dispositivo (telemóvel, computador ou tablet). Uma sessão pode
        ser associada à conta depois de iniciares sessão, para atribuir uma
        candidatura de parceiro ao seu canal de origem. Não guardamos o IP nem
        o endereço completo da página de origem nessa medição. Não integramos
        ferramentas de publicidade nem recolhemos dados de pagamento na aplicação.
      </p>

      <h2>Conservação e pedidos</h2>
      <p>
        Conservamos os dados enquanto a conta e os pedidos precisarem de ser
        geridos, e pelo período necessário para segurança, auditoria ou
        obrigações aplicáveis. Podes pedir uma cópia, correcção ou eliminação
        dos teus dados pelo email acima. Analisaremos o pedido e explicaremos
        se algum registo tiver de ser mantido. Também podes terminar a sessão
        na tua conta. Actualizaremos esta página quando mudarem as práticas de
        tratamento de dados.
      </p>

      <p className="privacy-return">
        <Link href="/sobre">Conhecer o projecto IBIZA →</Link>
      </p>
    </main>
  );
}
