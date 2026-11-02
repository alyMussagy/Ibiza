> Actualização de 02/11/2026: o estado actual e as validações estão em [operations-release.md](operations-release.md). Este documento descreve a implementação anterior.

# Fotografias e detalhe das ofertas

Implementado em 02/11/2026. Migration 0006 preparada; activação externa ainda pendente de confirmação.

- Bucket privado `listing-photos`, limitado a JPG, PNG e WebP de até 3 MB.
- Proprietários/gestores confirmados de negócios aprovados podem carregar imagens em anúncios em rascunho ou rejeitados. Não há permissão de substituição de objectos.
- Associação transaccional à listagem, máximo de 8 fotografias, descrição acessível, controlo de versão e auditoria.
- Galeria no editor e na revisão administrativa. Fotografias dos anúncios publicados aparecem no catálogo e no detalhe `/ofertas/[id]`.
- Endpoint `/media/[id]` usa a sessão e RLS para consultar e descarregar a imagem, com `private, no-store` e `nosniff`. Não usa bucket público nem URLs assinados que continuem válidos depois da retirada do anúncio.
- O detalhe público exige explicitamente publicação e parceiro aprovado, incluindo para visitantes autenticados que possam gerir rascunhos.

## Verificação e limites

Build/TypeScript, 32 testes unitários/integrados e 20 testes de navegador (desktop e móvel) passaram. O teste PostgreSQL inclui isolamento entre parceiros, imagem privada antes de publicação, bloqueio de substituição, bloqueio de envio durante revisão e perda de acesso público após suspensão. O esquema Storage nesses testes é uma representação mínima; não substitui um envio real através da API Storage.

Ainda falta testar upload real com uma conta de parceiro aprovada distinta da conta administradora, em desktop e telemóvel. Não foram criadas ofertas fictícias no projecto real. Imagens enviadas mas não associadas por falha/conflito ficam privadas e exigem limpeza operacional; remoção e reordenação de fotografias ainda não têm interface. Estas pendências devem ser resolvidas antes do lançamento. Não há checkout, reservas ou pagamentos nesta entrega.

## Instalação

Executar `docs/setup/supabase-upgrade-0006.sql` uma vez sobre a instalação até 0005. A transacção confere o journal antes de alterar o serviço. O bootstrap destina-se apenas a projectos novos.

Referências oficiais: [políticas de acesso Storage](https://supabase.com/docs/guides/storage/security/access-control) e [restrições dos buckets](https://supabase.com/docs/guides/storage/buckets/creating-buckets).
