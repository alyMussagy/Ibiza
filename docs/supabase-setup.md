# Configurar Supabase — IBIZA Desenvolvimento

Usar a nova conta indicada pelo proprietário. Não reutilizar a organização anterior nem outros projectos existentes. Nunca enviar palavras-passe ou chaves secretas pelo chat.

## 1. Criar o projecto

No [painel Supabase](https://supabase.com/dashboard), criar `IBIZA Desenvolvimento` na conta certa. Escolher a região disponível mais adequada aos utilizadores e ao alojamento. Guardar a palavra-passe da base de dados num gestor de palavras-passe. Não aceitar upgrades pagos automaticamente.

Manter Data API activada, desactivar exposição automática de tabelas e activar RLS automático. As migrations atribuem explicitamente os acessos mínimos. Não desactivar confirmação de email.

## 2. Preparar variáveis locais

Em `.env.local`, ignorado pelo Git:

```dotenv
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=CHAVE_PUBLICAVEL_DO_PROJECTO
DATABASE_URL=CONEXAO_POSTGRES_PRIVADA
```

URL e chave publicável ficam no diálogo Connect/API Keys. Não copiar `service_role` nem chaves `sb_secret_` para variáveis `NEXT_PUBLIC_*`. A aplicação usa o token do utilizador com RLS; não precisa de service_role. A ligação PostgreSQL só é necessária para migrations via terminal. Copiar a string de ligação disponibilizada pelo painel, usando o pooler adequado à rede, sem a partilhar no chat. Reiniciar `npm run dev` depois de configurar.

## 3. Criar o esquema

Opção recomendada com ligação SQL privada: `npm run db:migrate`. O script carrega `.env.local` e aplica o journal Drizzle.

Alternativa sem copiar a palavra-passe para a aplicação: num projecto **novo e vazio**, gerar `npm run db:bootstrap`, abrir `docs/setup/supabase-bootstrap.sql`, copiar o conteúdo para o SQL Editor Supabase e executar. O ficheiro cria esquema, RLS, funções e journal numa transacção. Não repetir nem usar num projecto com tabelas/dados existentes. Depois desta instalação, usar migrations normais para futuras alterações.

Confirmar 11 tabelas públicas e 4 entradas em `drizzle.__drizzle_migrations`. As RPCs `submit_partner_application` e `review_partner_application` devem existir. A ausência de políticas de INSERT/UPDATE para tabelas de negócio é intencional: as mutações entram pelas funções que validam identidade e permissões.

## 4. Configurar Auth

Em Authentication → URL Configuration:

- Site URL: `http://127.0.0.1:3000`
- Redirect URLs: `http://127.0.0.1:3000/auth/callback` e `http://127.0.0.1:3000/auth/callback?next=/actualizar-palavra-passe`
- Adicionar os endereços HTTPS exactos de staging quando esse ambiente existir. Não usar redireccionamentos de produção indiscriminados com wildcards.

Activar Email/Password e manter confirmação de email. Definir mínimo de 12 caracteres no fornecedor e configurar limites de pedidos. Antes de disponibilizar registo público, configurar SMTP próprio e protecção contra abuso/CAPTCHA no fornecedor e no formulário.

Os templates por token hash funcionam mesmo quando o email é aberto noutro browser:

Confirm signup (ligação): `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`

Reset password (ligação): `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`

Manter os placeholders exactamente como acima. O endpoint aceita apenas signup/recovery e redirecciona para destinos internos fixos. O callback PKCE também existe. Templates e callbacks devem ser testados com emails reais antes do lançamento.

O serviço SMTP de testes Supabase tem restrições de destinatários e limites baixos; não assume que entrega a todos os emails. Verificar SMTP/logs se não chegar. A confirmação do envio na aplicação não comprova a entrega.

## 5. Primeiro administrador

Registar e verificar a conta da pessoa responsável. O proprietário da base de dados deve identificar o UUID exacto em Authentication → Users e atribuir, no SQL Editor, o papel `super_admin` nessa conta. Não existe auto-promoção no frontend. Executar apenas depois de confirmar a identidade do administrador:

```sql
INSERT INTO public.platform_roles(profile_id,role)
VALUES ('UUID_DA_CONTA_VERIFICADA','super_admin');
```

O template acima não é executável até substituir o UUID. Não confiar em user_metadata para atribuir papéis. O administrador não pode aprovar a candidatura do próprio negócio.

## 6. Aceitação com o serviço real

1. Registar duas contas de teste controladas, confirmar os emails e entrar/sair.
2. Recuperar acesso e alterar palavra-passe; reutilização de ligação deve falhar.
3. Enviar candidatura na conta A; confirmar que B não lê contactos/candidatura de A.
4. Entrar como administrador separado; aprovar/rejeitar, verificar o painel do candidato e auditoria.
5. Repetir uma decisão deve falhar sem duplicar auditoria. Utilizador normal não acede a `/admin/parceiros` nem consegue invocar a RPC de revisão.
6. Recarregar rotas privadas para validar renovação de cookies e testar expiração de sessão. Confirmar `Cache-Control: private, no-store`.

Referências: [SSR Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [palavras-passe e recuperação](https://supabase.com/docs/guides/auth/passwords), [templates de email](https://supabase.com/docs/guides/auth/auth-email-templates). Ainda não foram aplicadas alterações num projecto Supabase real nesta fase de implementação.
