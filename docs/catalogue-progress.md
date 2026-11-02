# Catálogo persistente — estado de implementação

Actualização de 02/11/2026. O proprietário executou `docs/setup/supabase-upgrade-0005.sql`. A API real confirmou as novas colunas sem erro. A página pública `/ofertas`, a fila autenticada `/admin/anuncios` e a restrição para negócios não aprovados em `/business/anuncios` foram verificadas no navegador. O catálogo público e a fila estão vazios; não foram criadas ofertas fictícias.

## Implementado

Criação e edição de rascunhos por proprietários/gestores de organizações aprovadas; localização, descrição, categoria e preço informativo em MZN; submissão para revisão; aprovação/rejeição administrativa auditada; publicação visível apenas enquanto o parceiro estiver aprovado. Edições retiram a oferta da publicação e exigem nova revisão. Revisões concorrentes são protegidas por versão e bloqueio transaccional. Não há escrita directa de clientes nas tabelas.

## Validação

Build e TypeScript passaram. 31 testes unitários/integrados e 16 testes de navegador passaram. Os testes PostgreSQL verificam isolamento, publicação, edição, versões antigas, suspensão, validação de argumentos e auditoria. O fluxo completo de criação e aprovação foi testado no PostgreSQL embebido, ainda não com duas contas distintas no Supabase real. A conta administradora actual não tem negócio aprovado e a interface apresenta correctamente esse estado.

## Trabalho restante

Fotografias/Storage, página detalhada e pesquisa das ofertas persistentes, paginação, arquivamento, favoritos, inventário, reservas, bilhetes, pagamentos e preparação operacional. O catálogo editorial `/explorar` permanece identificado como demonstração e liga ao catálogo real. As páginas de gestão apresentam no máximo 100 anúncios. Preços são informativos: não há checkout nem promessa de reserva.

Instalações anteriores a 0005: executar a actualização apropriada uma única vez, ou `npm run db:migrate` com ligação autorizada. Não repetir o bootstrap num projecto existente.
