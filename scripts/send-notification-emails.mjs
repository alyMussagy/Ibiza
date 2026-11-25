import postgres from "postgres";
import nodemailer from "nodemailer";
// Run from a private worker only. Never expose these credentials through NEXT_PUBLIC variables.
const required = [
  "DATABASE_URL",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM",
  "NEXT_PUBLIC_APP_URL",
];
if (required.some((key) => !process.env[key])) {
  console.error(
    "Email worker not configured. Required variables: " + required.join(", "),
  );
  process.exit(1);
}
const origin = new URL(process.env.NEXT_PUBLIC_APP_URL);
if (origin.protocol !== "https:" || origin.username || origin.password)
  throw new Error("Production HTTPS origin required");
const port = Number(process.env.SMTP_PORT);
if (![465, 587].includes(port)) throw new Error("Use SMTP port 465 or 587");
const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: "require" });
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: port === 465,
  requireTLS: true,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 30000,
});
try {
  await transport.verify();
  for (let i = 0; i < 50; i++) {
    const jobs = await sql.begin(
      async (tx) =>
        tx`WITH next AS (SELECT j.notification_id FROM public.notification_email_jobs j JOIN public.notifications n ON n.id=j.notification_id WHERE j.sent_at IS NULL AND j.attempts<8 AND j.next_attempt_at<=now() AND (j.leased_until IS NULL OR j.leased_until<now()) AND n.created_at>now()-interval '24 hours' ORDER BY j.next_attempt_at FOR UPDATE OF j SKIP LOCKED LIMIT 1) UPDATE public.notification_email_jobs j SET attempts=attempts+1,lease_id=gen_random_uuid(),leased_until=now()+interval '5 minutes' FROM next WHERE j.notification_id=next.notification_id RETURNING j.*`,
    );
    const job = jobs[0];
    if (!job) break;
    try {
      const [notice] =
        await sql`SELECT n.title,n.body,n.href,u.email FROM public.notifications n JOIN auth.users u ON u.id=n.profile_id WHERE n.id=${job.notification_id} AND u.email_confirmed_at IS NOT NULL`;
      if (!notice?.email) throw new Error("RECIPIENT_UNAVAILABLE");
      if (!["/reservas", "/business/reservas"].includes(notice.href))
        throw new Error("INVALID_DESTINATION");
      await transport.sendMail({
        from: process.env.SMTP_FROM,
        to: notice.email,
        subject: "IBIZA · " + notice.title,
        text:
          notice.title +
          "\n\n" +
          notice.body +
          "\n\nConsulta os detalhes: " +
          new URL(notice.href, origin).href,
        messageId: "<" + job.notification_id + "@" + origin.hostname + ">",
      });
      await sql`UPDATE public.notification_email_jobs SET sent_at=now(),leased_until=NULL,last_error=NULL WHERE notification_id=${job.notification_id} AND lease_id=${job.lease_id}`;
      console.log("Notification sent: " + job.notification_id);
    } catch {
      await sql`UPDATE public.notification_email_jobs SET leased_until=NULL,last_error='Delivery failed; check provider privately',next_attempt_at=now()+interval '5 minutes'*power(2,least(attempts,8)) WHERE notification_id=${job.notification_id} AND lease_id=${job.lease_id}`;
      console.error("Notification delivery failed: " + job.notification_id);
    }
  }
} finally {
  transport.close();
  await sql.end();
}
