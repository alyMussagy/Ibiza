> Actualização de 02/11/2026: o estado actual e as validações estão em [operations-release.md](operations-release.md). Este documento descreve a implementação anterior.

# Painel administrativo — 02/11/2026

## Implementação

`/admin` reúne contagens exactas de candidaturas pendentes, parceiros aprovados, anúncios em análise, pedidos de reserva pendentes não expirados, reservas confirmadas com início no dia de Maputo e reservas confirmadas em curso/futuras. As consultas independentes são paralelas, não constituem um snapshot transaccional único. Não são indicadores de receita ou pagamentos recebidos.

`/admin/reservas` permite consulta por oferta/nome do cliente, estado efectivo (incluindo expirados) e intervalo de datas de início. Paginação de 20 linhas, ordenação determinística por criação e ID. Cartões administrativos são somente de leitura e não apresentam comandos de confirmação ou cancelamento.

`/admin/auditoria` permite consulta por área e datas, com paginação de 20 linhas, identificadores do actor e negócio e detalhes JSON escapados pelo React. Não permite alterar ou apagar registos. Acesso apenas a super_admin verificado no servidor e pelas políticas RLS existentes.

Candidaturas de parceiros ganharam filtro por estado e paginação; cada candidatura mostra também o estado actual da organização. Navegação comum liga as cinco áreas administrativas. O perfil passa a abrir a visão geral. Redireccionamentos de login continuam limitados a destinos internos explícitos.

## Instalação e validação

Não há migration nova: depende de 0000–0008 já instaladas. Build/TypeScript verificados; testes funcionais e de autorização continuam adiados a pedido do proprietário. Antes de lançamento, verificar métricas com dados controlados, datas de Maputo, expiração, filtros/paginação, tentativas de acesso por clientes/parceiros e visualização móvel. Não afirmar que o painel foi validado em utilização real.

Ainda não há relatórios financeiros, exportação, gestão de permissões pela interface ou intervenção administrativa nas reservas. A fila de anúncios mantém o limite anterior de 100 registos. O modelo de reservas por períodos definidos continua a precisar dos testes de concorrência e dos restantes critérios documentados em `reservations.md`.
