# IBIZA — Descobre. Reserva. Vive.

Fase 1: fundação técnica e prévia editorial responsiva para turismo e entretenimento em Inhambane, Moçambique. **Não existem ofertas, pagamentos, bilhetes ou reservas reais nesta versão.**

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

## Configurar Supabase numa fase seguinte

Copiar `.env.example` para `.env.local` e preencher URL e chave publicável do projecto Supabase. Nunca colocar a chave `service_role` no frontend. `DATABASE_URL` é secreta e só existe no servidor. O Next.js carrega `.env.local`; a CLI Drizzle precisa que `DATABASE_URL` esteja definida no ambiente do terminal antes de `npm run db:migrate` (ou que se use um carregador seguro de variáveis).

Executar migrations apenas num projecto Supabase de desenvolvimento. O esquema `auth`, `auth.users`, `auth.uid()` e os papéis `anon`/`authenticated` devem existir. As migrations iniciais criam 8 tabelas, RLS e guardas de publicação. A Fase 1 não configura autenticação, Storage nem permite escritas a utilizadores. O cliente SSR fornecido é explicitamente de leitura: operações que alteram sessões falham até serem implementados Route Handlers e renovação de cookies na Fase 2.

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

Dependências fixadas em `package.json` e `package-lock.json`. `components.json` configura os aliases e Tailwind para acrescentar componentes shadcn/ui. Não foi criado um projecto Sites ou Vercel: esta entrega mantém o repositório Next.js solicitado, com prévia local e publicação de staging pendente.
