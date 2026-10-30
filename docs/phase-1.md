# Relatório — Fase 1

Data: 30 de Outubro de 2026.

## Implementado

- Next.js App Router, React, TypeScript strict, Tailwind v4 e configuração shadcn/ui.
- Tokens IBIZA, fonte Inter local, marca substituível, Button/Card, layouts, navegação responsiva, skip-link e foco visível.
- Homepage com fotografia, cinco categorias, pesquisa GET com filtros, estados vazios, detalhes de demonstração e partilha nativa/cópia de ligação.
- Páginas públicas Business e Sobre, erro, carregamento e 404.
- Clientes Supabase preparados, validação de configuração e `.env.example` sem segredos.
- Oito tabelas Drizzle, duas migrations, RLS de leitura, bloqueio de publicação sem aprovação e timestamps automáticos.
- Contratos de pagamentos e fixture que só devolve pending em desenvolvimento/testes.
- Documentação de instalação, arquitectura, regras, dados, design e fases futuras.

## Testado

- 7 testes unitários: pesquisa, acentos, filtros, categorias, configuração e bloqueio do simulador.
- 3 testes de integração em PostgreSQL embebido PGlite: aplicação das migrations, publicação sem aprovação, isolamento de perfis, privilégios, visibilidade e suspensão.
- 6 testes Playwright em Chromium: desktop e viewport móvel; pesquisa, detalhes, filtros, recuperação de resultados vazios, menu, categorias, páginas institucionais, 404 e overflow na página de alojamentos.
- TypeScript sem erros e build de produção bem-sucedido.
- Homepage inspeccionada visualmente a 1440px e 390px.
- `npm audit`: zero vulnerabilidades reportadas depois do override de esbuild transitivo do Drizzle. `db:generate` confirma ausência de diferenças no esquema.

## Não testado e dependências externas

- Supabase alojado: sem projecto/credenciais fornecidos; migrations não aplicadas num serviço externo.
- Login, sessões reais, uploads, emails, autorização empresarial completa e dashboards pertencem às fases seguintes.
- Concorrência de inventário, reservas, QR, webhooks, ledger e reembolsos ainda não implementados.
- Safari/Firefox, dispositivos físicos, testes de carga e auditoria completa WCAG pendentes.
- Sem publicação em staging ou produção. A execução disponível é local.

## Limitações e riscos conhecidos

- Fotografias ilustrativas, sem certificação de localização; trocar por activos locais autorizados antes do lançamento.
- Catálogo demonstrativo fixo; não serve como inventário e não aceita transacções.
- O cliente SQL privilegiado exige autorização explícita dos serviços futuros; não está exposto por endpoints.
- Cliente Supabase SSR de leitura apenas; mutações de sessão exigem implementação de cookies na Fase 2.
- A correcção transitiva de esbuild está fixada em overrides e deve ser reavaliada ao actualizar Drizzle.
- Logótipo, perfis de redes sociais, textos legais e credenciais de alojamento ainda não fornecidos.

## Próxima fase

Fase 2: configurar Supabase de desenvolvimento, aplicar migrations, implementar registo/login/verificação/recuperação/logout e refresh de sessão; candidaturas de parceiros, aprovação auditada e autorização por organização. Os testes dessa fase devem provar que um parceiro não acede aos dados de outro nem altera a própria aprovação.
