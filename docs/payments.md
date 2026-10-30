# Pagamentos — apenas contratos

`PaymentProvider` define intenção, consulta, webhook verificável, reembolso, consulta de liquidação e repasse opcional. Confirmação é um estado obtido da consulta ao fornecedor ou de webhook verificado; nunca uma acção do cliente. A implementação futura precisa validar ordem, moeda, valor, assinatura e eventId, numa transacção idempotente.

O simulador da Fase 1 é uma fixture pura de desenvolvimento/testes, não uma implementação do fornecedor. Só devolve `pending`, rejeita produção, não confirma nem guarda pagamentos, e não é importado em rotas. Não existe endpoint de pagamento ou emissão de bilhetes.

Antes de integrar M-Pesa, e-Mola ou bancos: escolher prestador autorizado e validar contratos, credenciais, suporte de split, liquidação diferida, reconciliação e requisitos regulatórios com profissionais locais. Não se presume que essas capacidades existam. Não movimentar fundos reais nesta fase.

Ledger futuro: lançamentos imutáveis de débito/crédito, chaves idempotentes únicas, comissões registadas por transacção, reembolsos compensatórios e reconciliação. Não editar valores históricos nem enviar repasses a partir de confirmação do frontend.
