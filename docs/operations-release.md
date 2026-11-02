# Funcionalidades operacionais — 02/11/2026

## Estado

Migrations 0009–0014 aplicadas no Supabase IBIZA e verificadas no SQL Editor: 15 registos no histórico. O controlo de entradas mostra o resultado de cada validação; o resumo agregado por categoria fica para uma melhoria posterior.

Build e TypeScript passam. 37 testes Vitest passam, incluindo PostgreSQL em PGlite com papéis anon/cliente/parceiro/admin distintos. 20 testes Playwright passam em desktop e viewport móvel. Estes resultados não substituem testes com sessões reais ou concorrência entre ligações PostgreSQL independentes. O proprietário vai registar duas contas amanhã; upload real, câmara física e reservas simultâneas estão pendentes.

## Funcionalidades

- Fotografias: ordenação completa, remoção em rascunho, revisão optimista, limpeza de uploads órfãos via Storage API. Tombstones impedem reanexação após início da limpeza. Limpeza manual até 100 objectos por execução; ficheiros não são apagados directamente por SQL. Tombstones mantidos intencionalmente para impedir reutilização de nomes.
- Arquivo: retira a oferta do catálogo e preserva reservas. Voltar a publicar exige guardar e reenviar para análise.
- Parceiros: administrador independente suspende/reactiva com motivo e auditoria. A suspensão bloqueia vendas e visibilidade pública; não cancela automaticamente reservas existentes.
- Equipa: proprietário de negócio aprovado adiciona conta confirmada por UUID, altera gestor/colaborador/scanner ou remove acesso. Não altera proprietários nem papéis globais. O identificador é mostrado no perfil do colaborador.
- Suporte: super_admin regista notas internas ou cancela uma reserva com motivo. Bilhetes já utilizados impedem cancelamento por suporte. Sem reembolsos ou pagamento implícito.
- Notificações: avisos transaccionais para cliente e gestores ao pedir, confirmar, recusar, cancelar ou concluir; leitura individual. Expiração continua calculada, sem aviso automático de expiração nesta versão.
- Eventos: categorias com capacidades e preços independentes, reserva através do inventário existente. Confirmação de reserva gratuita em categoria gera um QR por unidade. Bilhetes pagos NÃO são emitidos sem integração de pagamento. Períodos legados sem categoria não emitem bilhete.
- Entrada: scanner online, permissão owner/manager/scanner confirmada e negócio aprovado, janela de duas horas antes até ao fim, estado da reserva verificado em cada leitura, consumo único transaccional. O token é aleatório e privado por RLS; não é colocado na URL nem no registo de auditoria. A perda de resposta deve levar a consultar a indicação de código já usado, não a autorizar uma segunda entrada.
- Estadia: inventário por noite e preço por unidade; chegada a partir do dia seguinte, máximo 90 noites, entrada às 14h/saída às 10h em Maputo. Descontos de 7 e 28 noites configuráveis entre 0 e 90%, não cumulativos. Todas as noites precisam de inventário. O servidor recalcula preço e capacidade, serializa pedidos pela oferta e mantém idempotência por cliente. É preciso fechar períodos legados antes da venda por noite. Capacidade não pode ficar abaixo das reservas activas; preços existentes são preservados.
- Catálogo: homepage, categorias, pesquisa, rodapé e percurso inicial ligam ofertas publicadas de parceiros aprovados. Conteúdo editorial antigo em /descobrir continua identificado como ilustrativo.

## Operação e limites

SMTP e domínio ainda não existem. Ver email-production.md. As tabelas e funções das migrations customizadas são geridas pelo SQL versionado; não usar drizzle push para recriar este modelo.

Antes de lançamento: validar cliente/parceiro reais, upload/remoção no Storage, duas compras concorrentes da última vaga, pedidos que expiram durante espera por bloqueio, câmara móvel real, confirmação e recuperação de email, entregabilidade SMTP e fornecedor de pagamento. Não declarar pagamentos, emails enviados ou testes reais como concluídos.
