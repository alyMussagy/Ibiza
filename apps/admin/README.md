# IBIZA Operação

Aplicação administrativa independente do site público. Partilha o mesmo repositório, cliente Supabase e regras de negócio. Usa uma sessão própria no domínio administrativo.

## Desenvolvimento local

1. Copiar `.env.example` para `.env.local` nesta pasta e preencher a URL e a chave publicável do mesmo projeto Supabase usado pelo site público.
2. Na raiz do repositório: `npm install` e `npm run dev:admin`.
3. Abrir `http://127.0.0.1:3001`. O acesso requer uma conta confirmada com `platform_roles.role = 'super_admin'`.

## Publicação na Vercel

Criar um segundo projeto Vercel a partir do mesmo repositório GitHub, com:

- **Root Directory:** `apps/admin`
- **Framework:** Next.js
- **Include source files outside of the Root Directory:** ligado, pois esta aplicação importa código partilhado de `src/` na raiz.
- **Variáveis Production e Preview:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `NEXT_PUBLIC_PUBLIC_APP_URL=https://ibiza-mz.vercel.app`.
- **Production Branch:** a mesma branch usada para publicar o site público, após validar a versão administrativa.

Não usar a chave `service_role` no navegador ou nas variáveis públicas. A aplicação utiliza a chave publicável e confirma o papel de administrador no servidor; o Supabase continua a impor as políticas RLS. A conta administradora inicia uma sessão separada no domínio do painel. Nenhuma migração SQL é necessária para esta divisão.

O painel está publicado em `https://ibiza-admin-blue.vercel.app`. O site público encaminha a entrada de administração e os endereços antigos `/admin` para este domínio. Testar as cinco áreas com a conta administradora depois de iniciar sessão no painel.
