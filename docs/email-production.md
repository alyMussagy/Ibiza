# Emails de produção

O envio está implementado mas desactivado por falta de domínio/SMTP. Nenhum email foi enviado pelo worker durante este trabalho.

1. Configurar domínio e remetente no fornecedor escolhido, incluindo os registos DNS que o fornecedor indicar.
2. Num worker privado, definir DATABASE_URL, SMTP_HOST, SMTP_PORT (465 ou 587), SMTP_USER, SMTP_PASSWORD, SMTP_FROM e NEXT_PUBLIC_APP_URL (HTTPS). Nunca usar prefixo NEXT_PUBLIC para credenciais. Usar utilizador de base de dados restrito às tabelas necessárias em produção.
3. Executar npm run emails:send com essas variáveis já disponíveis no ambiente; o script não carrega .env.local automaticamente. Testar primeiro com contas controladas. Só agendar após verificar a entrega e a configuração.
4. Configurar separadamente o SMTP de autenticação em Supabase Authentication para confirmação de conta/recuperação. O worker trata avisos de reservas, não os emails de autenticação.

A fila é criada na mesma transacção dos avisos. O worker usa SKIP LOCKED, lease de cinco minutos, até 50 emails por execução, oito tentativas com espera crescente e Message-ID determinístico. Só processa avisos criados nas últimas 24 horas: mensagens antigas não são enviadas em massa quando SMTP for activado. Falhas e jobs antigos precisam de acompanhamento operacional. O SMTP não garante exactly-once: um crash depois da aceitação e antes de marcar sent_at pode duplicar a entrega. A fila não é acessível ao navegador; logs não incluem destinatários nem segredos.

Documentação de referência: [Nodemailer SMTP](https://nodemailer.com/smtp), [QR Code](https://github.com/soldair/node-qrcode), [ZXing Browser](https://github.com/zxing-js/browser).
