# Arquitectura

Monólito modular: Next.js App Router + React + TypeScript strict, Tailwind v4, componentes locais shadcn/ui (Button com Radix Slot/CVA e Card), Lucide, Supabase PostgreSQL/Auth/Storage, Drizzle e Zod. Vitest e Playwright verificam a fundação.

Componentes de página renderizam no servidor. Apenas menu móvel e partilha requerem estado cliente. Pesquisa GET permite endereços partilháveis, valida os filtros e normaliza acentos. Fontes Inter servidas localmente pelo pacote Fontsource; fotografias locais optimizadas por next/image. Sem pedidos a fornecedores de fontes ou imagens no browser.

Customer, Business e Admin têm fronteiras de segurança no servidor e na base de dados. `/business` permanece uma apresentação pública; `/business/painel` e `/business/candidatura` requerem identidade confirmada; `/admin/parceiros` requer super_admin. As RPCs verificam novamente as permissões, com pesquisa de organização no servidor PostgreSQL. Não confundir grupos de rotas com autorização. As páginas de conta são dinâmicas e o proxy aplica no-store e renova cookies.

PostgreSQL será fonte de verdade de negócio. O catálogo desta fase é um conjunto editorial fixo, explicitamente demonstrativo, sem compras. O futuro repositório de listagens substituirá os exemplos, com transacções no servidor e políticas RLS. Nenhum estado de negócio é guardado em localStorage.

O cliente SQL privilegiado é server-only e não é chamado pelas páginas. Operações futuras terão de autenticar, autorizar e verificar organização antes de usar Drizzle; as permissões elevadas da ligação SQL podem contornar RLS. Nunca aceitar organizationId sem validação da associação do utilizador.

## Evolução

2. Auth, refresh de cookies, perfis, candidaturas e aprovação auditada.
3. Catálogo persistente, Storage com políticas e moderação.
4. Reservas, unidades/noites e sessões; bloqueios e concorrência.
5. Eventos e bilhetes, QR opaco e check-in atómico.
6. Adaptadores de pagamentos, idempotência e comissões por transacção.
7. Ledger imutável, reembolsos, liquidações e administração.
8. Testes de carga, acessibilidade completa, observabilidade e lançamento.

Foram consultadas as referências oficiais de [Next.js](https://nextjs.org/docs/app/getting-started/installation), [Tailwind](https://tailwindcss.com/docs/installation/framework-guides/nextjs), [shadcn/ui](https://ui.shadcn.com/docs/installation/manual) e [Supabase SSR](https://supabase.com/docs/guides/auth/server-side). A compatibilidade foi também verificada pelas dependências npm, tipos e build instalados.
