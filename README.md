# IBIZA — Descobre. Reserva. Vive.

Fases 1–2: descoberta editorial, identidade oficial IBIZA, autenticação Supabase e candidaturas de parceiros com aprovação administrativa. **Não existem ofertas, pagamentos, bilhetes ou reservas reais nesta versão.** A activação e validação de contas reais depende da configuração do projecto Supabase.

## Executar

Requer Node.js 22 ou superior (validado com Node 24) e npm. Na pasta do projecto:

```sh
npm ci
npm run dev
```

Abrir http://127.0.0.1:3000. A homepage funciona sem credenciais externas. Os exemplos estão em `src/features/listings/catalog.ts`, exclusivamente para apresentação e testes. Não são inventário de negócio.

```sh
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Para servir o build: `npm run start`. Parar com Ctrl+C.

## Configurar Supabase

Seguir [o guia de configuração](docs/supabase-setup.md). Copiar `.env.example` para `.env.local`, definir URL da aplicação, URL Supabase e chave publicável. Nunca colocar `service_role` ou `sb_secret_*` no frontend. `DATABASE_URL` é privada e necessária apenas para migrations via terminal. `npm run db:migrate` carrega `.env.local` automaticamente.

Executar migrations apenas num projecto Supabase de desenvolvimento. As 4 migrations criam 11 tabelas, RLS e funções transaccionais para candidatura/revisão. O cliente SSR grava cookies em Server Actions/Route Handlers; `src/proxy.ts` renova a sessão antes da renderização. As áreas privadas verificam identidade no servidor, e as RPCs voltam a verificar permissões na base de dados. Sem configuração, os formulários de autenticação não enviam dados. Storage fica para a fase do catálogo persistente.

Alternativa para um projecto novo: `npm run db:bootstrap` gera SQL para o SQL Editor com journal Drizzle. Não aplicar em projectos com dados existentes.

## Estrutura

```text
src/app/                   rotas, layout, estados de erro e carregamento
src/components/ui/         componentes locais no padrão shadcn/ui
src/components/layout/     marca substituível, header e footer
src/components/marketplace/ pesquisa, cartões e partilha
src/features/listings/     exemplos editoriais e pesquisa
src/features/payments/     contratos e fixture de testes bloqueada em produção
src/lib/supabase/          clientes browser e servidor, validação de configuração
src/db/schema/             fonte do esquema Drizzle
src/db/migrations/         SQL e snapshots versionados
public/images/             fotografias ilustrativas locais
tests/                     testes unitários, PostgreSQL embebido e navegador
docs/                      arquitectura, regras e relatório da fase
```

## Documentação

- [Arquitectura](docs/architecture.md)
- [Base de dados](docs/database.md)
- [Regras comerciais](docs/business-rules.md)
- [Pagamentos](docs/payments.md)
- [Design e imagens](docs/design.md)
- [Relatório da Fase 1](docs/phase-1.md)
- [Configuração Supabase](docs/supabase-setup.md)
- [Relatório da Fase 2](docs/phase-2.md)

Dependências fixadas em `package.json` e `package-lock.json`. `components.json` configura os aliases e Tailwind para acrescentar componentes shadcn/ui. Não foi criado um projecto Sites ou Vercel: esta entrega mantém o repositório Next.js solicitado, com prévia local e publicação de staging pendente.
