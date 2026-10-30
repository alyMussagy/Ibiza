# Base de dados — Fase 1

Esquema inicial: profiles (identidade ligada a auth.users), organizations, organization_members, partner_applications, destinations, listings, listing_photos e favorites. UUIDs, chaves estrangeiras, slugs únicos, categorias/estados enum, ordenação única de fotografias e timestamps com actualização por trigger.

Migrations versionadas: `0000_illegal_wallop.sql` gerada por Drizzle e `0001_security.sql` para integrações Supabase, permissões, RLS e triggers. Manter SQL e snapshots existentes; futuras alterações usam `npm run db:generate`. Não usar push destrutivo como substituto das migrations.

RLS activa nas 8 tabelas. Nesta fase, clientes só podem ler: destinos, organizações aprovadas e listagens publicadas de organizações aprovadas. Perfis, associações, candidaturas e favoritos limitados ao próprio utilizador. Sem privilégios de escrita a anon/authenticated. A suspensão de uma organização oculta os seus anúncios públicos. Um trigger recusa publicação sem aprovação e bloqueia a linha da organização durante a verificação.

As tabelas de organizações contêm apenas nome, slug e estado público; dados empresariais confidenciais deverão ir para uma tabela privada na Fase 2. Não adicionar PII a uma tabela com política pública sem rever a exposição.

O SQL é testado num PostgreSQL embebido PGlite, com o mínimo de auth/roles simulado. Isto testa migrations, privilégios, RLS e triggers; não equivale a testar Supabase alojado, sessões reais ou pool de ligações. Aplicação em Supabase pendente de credenciais. Não foi inserido qualquer seed em serviços externos.

Próximas migrations: alojamentos, unidades, disponibilidade diária, restaurantes/pedidos de mesa, eventos/lotes, experiências/sessões, holds, pedidos/itens, reservas, pagamentos, reembolsos, comissões, ledger, liquidações, notificações e auditoria. Serão introduzidas na fase respectiva com testes de integridade e concorrência; não são funcionalidades implementadas nesta entrega.
