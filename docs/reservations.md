# Reservas por períodos definidos — implementação

02/11/2026. Build e TypeScript passaram. Implementação em código; migration 0008 ainda não aplicada. Testes funcionais e de concorrência adiados a pedido do proprietário. Não apresentar esta implementação como validada para clientes reais.

## Modelo operacional

O gestor define um período fechado (início/fim), capacidade e preço por unidade para TODO o período, em MZN. Define na descrição da oferta se a unidade corresponde a pessoa, quarto, mesa ou grupo. Não é um motor de preço por noite nem de escolha livre de check-in/check-out. Destinos editoriais não são reserváveis. Não há bilhete QR nem pagamento online neste fluxo.

Cliente confirmado selecciona período e 1–20 unidades. O servidor determina preço, oferta, organização e identidade, e guarda cópias do nome da oferta, nome do cliente, datas e total. O pedido é pendente e mantém capacidade até 24 horas ou até ao início do período. A expiração é calculada na leitura e no controlo da capacidade; não depende de um agendador, nem altera retroactivamente o estado persistido.

Gestor pode confirmar/recusar antes da expiração. Cliente ou gestor pode cancelar antes do início. Gestor pode concluir uma reserva confirmada após o fim. Cada alteração é auditada. Confirmação de reserva não significa pagamento. O cliente acompanha respostas em `/reservas`; ainda não existem notificações por email.

## Integridade implementada (a validar)

Bloqueio transaccional da linha do período para pedidos e decisões. Capacidade conta pedidos pendentes não expirados e reservas confirmadas. A confirmação volta a verificar a expiração depois do bloqueio usando o relógio actual. Chave de pedido por cliente evita repetição do mesmo envio; reutilização com conteúdo diferente falha. Apenas um pedido activo por cliente/período e no máximo cinco pendentes por conta. A API não aceita customer_id, organization_id ou total do navegador.

Períodos sobrepostos na mesma oferta são recusados. Fechar um período impede novos pedidos, preservando as reservas. Um período fechado com reservas activas continua a impedir criação de outro período sobreposto. Criação limita duração a 90 dias, início até dois anos no futuro e 365 períodos futuros activos por oferta.

RLS limita reservas ao cliente, proprietário/gestor e super_admin. Membros staff/scanner não recebem acesso a dados de reservas por esta implementação. Função pública de disponibilidade devolve apenas períodos, preços e vagas de ofertas publicadas de organizações aprovadas. Sem escrita directa dos clientes nas tabelas.

## Interfaces

- `/business/disponibilidade`: criar e fechar períodos; até 100 ofertas e 200 períodos futuros apresentados.
- `/business/reservas`: até 100 reservas recentes dos negócios geridos, com decisões e justificação.
- `/reservas`: até 100 reservas recentes da conta, notas e cancelamento antes do início.
- `/ofertas/[id]`: selecção de período/quantidade e total previsto, envio de pedido.

Todas as datas são apresentadas em Africa/Maputo. Entrada datetime-local é interpretada explicitamente como UTC+02 e validada contra datas inexistentes.

## Antes de activar para clientes

Aplicar `docs/setup/supabase-upgrade-0008.sql` após 0007. Validar migrations reais e transacções, acessos entre organizações, concorrência de pedidos/confirmações/expiração, idempotência, cancelamentos, horários e preços. Testar com duas contas controladas distintas. Acrescentar paginação, notificações, políticas operacionais definitivas, administração de suporte, inventário de alojamento por noite se necessário e integração de pagamento separada. Estes testes estão pendentes, não foram executados neste trabalho.
