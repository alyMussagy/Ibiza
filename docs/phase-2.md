# Fase 2 — Autenticação e parceiros

## Implementação

- Logótipo oficial fornecido pelo proprietário, preservado como ficheiro PNG. O layout enquadra as margens brancas sem modificar a arte.
- Registo, login, logout, confirmação de email, recuperação e alteração de palavra-passe; Supabase SSR com refresh de cookies e respostas privadas sem cache.
- Validação Zod no servidor, destinos de redireccionamento limitados a uma lista interna, mensagens neutras de recuperação e ausência de chaves privilegiadas no frontend.
- Perfil, candidatura, painel do parceiro e fila administrativa protegidos no servidor.
- Perfil automático via trigger de auth.users; metadados do registo não atribuem papéis de administração.
- Dados empresariais privados separados da organização pública. Funções RPC transaccionais verificam utilizador, confirmação, permissões, argumentos, duplicação e limite de candidaturas.
- Aprovação/rejeição apenas por super_admin e nunca sobre o próprio negócio. Decisões bloqueiam a candidatura durante a transacção e registam auditoria append-only.
- Instalação Supabase documentada e bootstrap SQL para projecto vazio com journal Drizzle.

## Verificação

24 testes unitários/integrados passaram, incluindo os testes anteriores. Foram testados RLS, tentativa de auto-promoção, acesso entre parceiros, email não confirmado, candidatura duplicada, revisão repetida, auto-aprovação administrativa e auditoria imutável. Auth SDK é simulado nos testes unitários; PostgreSQL embebido PGlite testa as migrations e funções reais.

Os 12 testes de navegador passaram sobre o build de produção, em desktop e viewport móvel: páginas públicas de contas, redireccionamento de visitantes, identidade e descoberta. TypeScript e build passaram; auditoria de dependências de produção sem vulnerabilidades reportadas. Ecrã de login revisto visualmente no navegador. O comportamento autenticado completo exige Supabase real e contas de teste controladas. Não confundir testes unitários com envio/entrega de emails reais.

## Estado externo e pendências

O projecto Ibiza (zxgdetzrlpbgnxrjvfny) foi configurado na nova conta: 11 tabelas com RLS, quatro migrations e duas RPCs verificadas no serviço real. Site URL, callbacks, confirmação obrigatória e mínimo de 12 caracteres estão configurados. Consultas anónimas a dados privados foram recusadas pela API. SMTP próprio, testes com contas controladas e primeiro administrador continuam pendentes. Nenhum email foi enviado pelo agente e nenhuma palavra-passe foi recolhida no chat.

Aceitação pendente: executar o roteiro de aceitação em `supabase-setup.md` com utilizadores controlados e um administrador separado; testar expiração/refresh, confirmação e recuperação por email. Antes de lançamento público: SMTP, protecção anti-abuso, política completa de privacidade e contacto de suporte, observabilidade e revisão de segurança.

Limites desta fase: candidatura inicial e decisão; sem convites/gestão de equipas, reenvio de candidaturas rejeitadas, suspensão pela interface, paginação além das últimas 100 candidaturas, upload de documentos ou anúncios comerciais. Estes limites são visíveis nas áreas de gestão; não existem pagamentos ou bilhetes reais.

Próxima fase funcional: catálogo persistente e gestão de anúncios (Fase 3), depois de validar a Fase 2 no projecto Supabase.
