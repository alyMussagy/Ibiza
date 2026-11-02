# Descoberta e favoritos — implementação em 02/11/2026

## Entregue em código

Catálogo real com pesquisa em título/descrição, localização, categoria, preço máximo em MZN, ordenação por data/preço e paginação de 12 ofertas. Filtros ficam no endereço para partilha e preservam-se entre páginas. Os valores são normalizados e limitados antes da construção da consulta. O preço por unidade fica explícito para evitar confundir pessoa/noite/mesa/grupo.

Cartão reutilizável com fotografia, preço, detalhe e botão de favorito. Área `/favoritos` com paginação, ligada ao perfil, e botão no detalhe da oferta. Ofertas retiradas ou de negócios suspensos aparecem como indisponíveis na lista privada, sem divulgar conteúdo que deixou de ser público.

RPC idempotente `set_listing_favorite` identifica o cliente pela sessão, exige email confirmado, só guarda ofertas publicadas de parceiros aprovados e permite retirar uma oferta mesmo após a sua retirada do catálogo. Não aceita ID do cliente. Limite de 500 por conta com serialização por utilizador. Sem permissões directas de escrita de clientes.

## Activação e validação

Build e TypeScript passaram. A pedido do proprietário, os testes funcionais e de utilização foram adiados; não foram executados testes nesta entrega. A migration 0007 ainda NÃO foi aplicada ao Supabase. Ficheiro pronto: `docs/setup/supabase-upgrade-0007.sql`. Não repetir migrations anteriores.

Antes de considerar concluído: aplicar 0007; testar isolamento e acesso anónimo, publicação/retirada/suspensão, gravação repetida e remoção, limite concorrente, persistência após novo login, filtros inválidos, páginas vazias, uso móvel e navegação por teclado. A pesquisa actual não normaliza acentos da coluna: termos sem acento podem não corresponder a títulos acentuados. Reservas, disponibilidade, bilhetes e pagamentos continuam pendentes.
