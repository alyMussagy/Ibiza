import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
const db = new PGlite();
const alice = "11111111-1111-4111-8111-111111111111",
  bob = "22222222-2222-4222-8222-222222222222",
  admin = "33333333-3333-4333-8333-333333333333",
  unconfirmed = "44444444-4444-4444-8444-444444444444";
let application: string, organization: string;
async function asUser(id: string) {
  await db.exec(
    `RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${id}',false)`,
  );
}
beforeAll(async () => {
  await db.exec(
    `CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,raw_user_meta_data jsonb DEFAULT '{}',email_confirmed_at timestamptz); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; GRANT USAGE ON SCHEMA public,auth TO anon,authenticated;`,
  );
  await db.exec(
    "CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text,UNIQUE(bucket_id,name)); ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; GRANT USAGE ON SCHEMA storage TO anon,authenticated; GRANT SELECT,INSERT,UPDATE ON storage.objects TO anon,authenticated;",
  );
  for (const file of [
    "0000_illegal_wallop.sql",
    "0001_security.sql",
    "0002_kind_energizer.sql",
    "0003_auth_partner_security.sql",
    "0004_profile_update.sql",
    "0005_listing_management.sql",
    "0006_listing_photos.sql",
    "0007_customer_favorites.sql",
    "0008_reservations.sql",
    "0009_listing_operations.sql",
    "0010_notifications.sql",
    "0011_event_tickets.sql",
    "0012_nightly_stays.sql",
    "0013_team_support.sql",
    "0014_email_outbox.sql",
  ])
    await db.exec(
      readFileSync(
        new URL(`../../src/db/migrations/${file}`, import.meta.url),
        "utf8",
      ),
    );
  await db.exec(
    `INSERT INTO auth.users VALUES ('${alice}','{"display_name":"Alice","role":"super_admin"}',now()),('${bob}','{"display_name":"Bob"}',now()),('${admin}','{}',now()),('${unconfirmed}','{}',null); INSERT INTO public.platform_roles(profile_id,role) VALUES('${admin}','super_admin');`,
  );
});
afterAll(() => db.close());
it("cria perfis mas ignora papéis enviados nos metadados de registo", async () => {
  expect((await db.query("SELECT * FROM public.profiles")).rows).toHaveLength(
    4,
  );
  expect(
    (await db.query("SELECT * FROM public.platform_roles")).rows,
  ).toHaveLength(1);
});
it("exige email confirmado e valida argumentos mesmo via RPC directa", async () => {
  await asUser(unconfirmed);
  await expect(
    db.query(
      "SELECT public.submit_partner_application('Casa','estadias','a@example.test','+258 840000000','Tofo','Descrição suficientemente longa')",
    ),
  ).rejects.toThrow("Confirmed email");
  await asUser(alice);
  await expect(
    db.query(
      "SELECT public.submit_partner_application(NULL,'estadias','a@example.test','+258 840000000','Tofo','Descrição suficientemente longa')",
    ),
  ).rejects.toThrow("Invalid application");
});
it("cria candidatura, organização, membro e auditoria atomicamente", async () => {
  await asUser(alice);
  const r = await db.query<{ id: string }>(
    "SELECT public.submit_partner_application('Casa Teste','estadias','a@example.test','+258 840000000','Tofo','Descrição suficientemente longa') AS id",
  );
  application = r.rows[0].id;
  const a = await db.query<{ organization_id: string }>(
    "SELECT organization_id FROM public.partner_applications",
  );
  organization = a.rows[0].organization_id;
  expect(
    (await db.query("SELECT approval FROM public.organizations")).rows,
  ).toEqual([{ approval: "pending" }]);
  await expect(
    db.query(
      "SELECT public.submit_partner_application('Outra Casa','estadias','a@example.test','+258 840000000','Tofo','Descrição suficientemente longa')",
    ),
  ).rejects.toThrow("Pending application");
});
it("isola dados empresariais entre parceiros e impede auto-aprovação", async () => {
  await asUser(bob);
  expect(
    (await db.query("SELECT * FROM public.partner_details")).rows,
  ).toHaveLength(0);
  expect(
    (await db.query("SELECT * FROM public.partner_applications")).rows,
  ).toHaveLength(0);
  expect(
    (await db.query("SELECT * FROM public.organizations")).rows,
  ).toHaveLength(0);
  await asUser(alice);
  await expect(
    db.query(
      `SELECT public.review_partner_application('${application}','approved','Sou eu mesmo')`,
    ),
  ).rejects.toThrow("Administrator required");
  await expect(
    db.exec("UPDATE public.organizations SET approval='approved'"),
  ).rejects.toThrow();
  await expect(
    db.exec(
      `INSERT INTO public.platform_roles(profile_id,role) VALUES('${alice}','super_admin')`,
    ),
  ).rejects.toThrow();
});
it("aprovação administrativa é única e auditada; contactos continuam privados", async () => {
  await asUser(admin);
  await db.query(
    `SELECT public.review_partner_application('${application}','approved','Informação verificada')`,
  );
  expect(
    (
      await db.query(
        "SELECT * FROM public.audit_logs WHERE action='partner.reviewed'",
      )
    ).rows,
  ).toHaveLength(1);
  await expect(
    db.query(
      `SELECT public.review_partner_application('${application}','rejected','Segunda decisão')`,
    ),
  ).rejects.toThrow("Application not pending");
  await asUser(bob);
  expect(
    (await db.query("SELECT * FROM public.partner_details")).rows,
  ).toHaveLength(0);
  expect(
    (await db.query("SELECT approval FROM public.organizations")).rows,
  ).toEqual([{ approval: "approved" }]);
});
it("administrador também não pode decidir sobre o próprio negócio", async () => {
  await asUser(admin);
  const r = await db.query<{ id: string }>(
    "SELECT public.submit_partner_application('Admin Casa','estadias','admin@example.test','+258 840000000','Tofo','Descrição suficientemente longa') AS id",
  );
  await expect(
    db.query(
      `SELECT public.review_partner_application('${r.rows[0].id}','approved','Não permitido')`,
    ),
  ).rejects.toThrow("Cannot review own");
});
it("auditoria rejeita alterações e dados anónimos são protegidos", async () => {
  await db.exec("RESET ROLE");
  await expect(
    db.exec("UPDATE public.audit_logs SET action='modified'"),
  ).rejects.toThrow("append-only");
  await db.exec("SET ROLE anon");
  await expect(
    db.query("SELECT * FROM public.partner_details"),
  ).rejects.toThrow();
  await expect(
    db.query(
      "SELECT public.submit_partner_application('Casa','estadias','a@example.test','+258 840000000','Tofo','Descrição suficientemente longa')",
    ),
  ).rejects.toThrow();
});

it("edição de perfil só altera o próprio nome e mantém permissões intactas", async () => {
  await asUser(alice);
  await db.query("SELECT public.update_own_profile('  Alice Actualizada  ')");
  expect(
    (await db.query("SELECT display_name FROM public.profiles")).rows,
  ).toEqual([{ display_name: "Alice Actualizada" }]);
  await expect(
    db.query("SELECT public.update_own_profile(' ')"),
  ).rejects.toThrow("Invalid display name");
  await expect(
    db.query("SELECT public.update_own_profile(NULL)"),
  ).rejects.toThrow("Invalid display name");
  await expect(
    db.query("UPDATE public.profiles SET display_name='Intruso' WHERE id=$1", [
      bob,
    ]),
  ).rejects.toThrow();
  await expect(
    db.query(
      "INSERT INTO public.platform_roles(profile_id,role) VALUES($1,'super_admin')",
      [alice],
    ),
  ).rejects.toThrow();
  await asUser(bob);
  expect(
    (await db.query("SELECT display_name FROM public.profiles")).rows,
  ).toEqual([{ display_name: "Bob" }]);
  await asUser(unconfirmed);
  await expect(
    db.query("SELECT public.update_own_profile('Nome Novo')"),
  ).rejects.toThrow("Confirmed email");
  await db.exec("RESET ROLE; SET ROLE anon");
  await expect(
    db.query("SELECT public.update_own_profile('Nome Novo')"),
  ).rejects.toThrow();
});
let listingId: string;
it("anúncios exigem gestor aprovado e ficam privados antes da revisão", async () => {
  await asUser(bob);
  await expect(
    db.query(
      "SELECT public.save_listing(NULL,$1,1,'Passeio na baía','Um passeio de barco com guia local e duração de duas horas.','experiencias','Tofo',150000,'pessoa',true)",
      [organization],
    ),
  ).rejects.toThrow("Approved partner manager");
  await asUser(alice);
  const result = await db.query<{ id: string }>(
    "SELECT public.save_listing(NULL,$1,1,'Passeio na baía','Um passeio de barco com guia local e duração de duas horas.','experiencias','Tofo',150000,'pessoa',true) AS id",
    [organization],
  );
  listingId = result.rows[0].id;
  expect(
    (
      await db.query("SELECT review_status FROM public.listings WHERE id=$1", [
        listingId,
      ])
    ).rows,
  ).toEqual([{ review_status: "pending" }]);
  await expect(
    db.query("UPDATE public.listings SET status='published' WHERE id=$1", [
      listingId,
    ]),
  ).rejects.toThrow();
  await asUser(bob);
  expect(
    (await db.query("SELECT id FROM public.listings WHERE id=$1", [listingId]))
      .rows,
  ).toHaveLength(0);
  await db.exec("RESET ROLE; SET ROLE anon");
  expect(
    (await db.query("SELECT id FROM public.listings WHERE id=$1", [listingId]))
      .rows,
  ).toHaveLength(0);
});
it("revisão verifica versão e publicação, edição retira a oferta do público", async () => {
  await asUser(alice);
  await expect(
    db.query(
      "SELECT public.review_listing($1,1,'approved','Oferta validada')",
      [listingId],
    ),
  ).rejects.toThrow("Administrator required");
  await asUser(admin);
  await expect(
    db.query(
      "SELECT public.review_listing($1,2,'approved','Oferta validada')",
      [listingId],
    ),
  ).rejects.toThrow("Listing changed");
  await db.query(
    "SELECT public.review_listing($1,1,'approved','Oferta validada')",
    [listingId],
  );
  await expect(
    db.query(
      "SELECT public.review_listing($1,1,'approved','Oferta validada')",
      [listingId],
    ),
  ).rejects.toThrow("Listing not pending");
  await db.exec("RESET ROLE; SET ROLE anon");
  expect(
    (await db.query("SELECT id FROM public.listings WHERE id=$1", [listingId]))
      .rows,
  ).toHaveLength(1);
  await asUser(alice);
  const query =
    "SELECT public.save_listing($1,$2,$3,'Passeio actualizado','Um passeio de barco com guia local e duração de três horas.','experiencias','Tofo',170000,'pessoa',true)";
  await expect(db.query(query, [listingId, organization, 1])).rejects.toThrow(
    "Listing changed",
  );
  await db.query(query, [listingId, organization, 2]);
  await db.exec("RESET ROLE; SET ROLE anon");
  expect(
    (await db.query("SELECT id FROM public.listings WHERE id=$1", [listingId]))
      .rows,
  ).toHaveLength(0);
  await asUser(admin);
  await expect(
    db.query(
      "SELECT public.review_listing($1,2,'approved','Oferta validada')",
      [listingId],
    ),
  ).rejects.toThrow("Listing changed");
  await db.query(
    "SELECT public.review_listing($1,3,'rejected','Explicar melhor o percurso')",
    [listingId],
  );
  expect(
    (
      await db.query(
        "SELECT * FROM public.audit_logs WHERE action='listing.reviewed'",
      )
    ).rows,
  ).toHaveLength(2);
});
it("RPC de anúncio rejeita valores inválidos e publicação por parceiro suspenso", async () => {
  await asUser(alice);
  await expect(
    db.query(
      "SELECT public.save_listing(NULL,$1,1,NULL,'Descrição longa suficiente para validação de anúncio.','experiencias','Tofo',-1,'pessoa',true)",
      [organization],
    ),
  ).rejects.toThrow("Invalid listing");
  await db.exec("RESET ROLE");
  await db.query(
    "UPDATE public.organizations SET approval='suspended' WHERE id=$1",
    [organization],
  );
  await asUser(alice);
  await expect(
    db.query(
      "SELECT public.save_listing(NULL,$1,1,'Novo passeio','Descrição longa suficiente para validação de anúncio.','experiencias','Tofo',100,'pessoa',true)",
      [organization],
    ),
  ).rejects.toThrow("Approved partner manager");
});
it("fotografias isolam parceiros, ficam privadas em rascunho e não são substituíveis", async () => {
  await db.exec("RESET ROLE");
  await db.query(
    "UPDATE public.organizations SET approval='approved' WHERE id=$1",
    [organization],
  );
  await asUser(alice);
  const objectName = listingId + "/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg";
  await db.query(
    "INSERT INTO storage.objects(bucket_id,name) VALUES('listing-photos',$1)",
    [objectName],
  );
  await expect(
    db.query("SELECT public.attach_listing_photo($1,$2,'Vista da praia',1)", [
      listingId,
      objectName,
    ]),
  ).rejects.toThrow("Listing changed");
  await db.query(
    "SELECT public.attach_listing_photo($1,$2,'Vista da praia',4)",
    [listingId, objectName],
  );
  expect(
    (await db.query("SELECT name FROM storage.objects")).rows,
  ).toHaveLength(1);
  const changed = await db.query(
    "UPDATE storage.objects SET name='replaced.jpg' RETURNING name",
  );
  expect(changed.rows).toHaveLength(0);
  await asUser(bob);
  expect(
    (await db.query("SELECT name FROM storage.objects")).rows,
  ).toHaveLength(0);
  await expect(
    db.query(
      "INSERT INTO storage.objects(bucket_id,name) VALUES('listing-photos',$1)",
      [listingId + "/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg"],
    ),
  ).rejects.toThrow();
  await expect(
    db.query("SELECT public.attach_listing_photo($1,$2,'Vista da praia',5)", [
      listingId,
      objectName,
    ]),
  ).rejects.toThrow("Photo access denied");
  await db.exec("RESET ROLE; SET ROLE anon");
  expect(
    (await db.query("SELECT name FROM storage.objects")).rows,
  ).toHaveLength(0);
  await asUser(alice);
  await db.query(
    "SELECT public.save_listing($1,$2,5,'Passeio com fotografias','Um passeio de barco com guia local e duração de três horas.','experiencias','Tofo',170000,'pessoa',true)",
    [listingId, organization],
  );
  await expect(
    db.query(
      "INSERT INTO storage.objects(bucket_id,name) VALUES('listing-photos',$1)",
      [listingId + "/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg"],
    ),
  ).rejects.toThrow();
  await asUser(admin);
  await db.query(
    "SELECT public.review_listing($1,6,'approved','Fotografia e descrição verificadas')",
    [listingId],
  );
  await db.exec("RESET ROLE; SET ROLE anon");
  expect(
    (await db.query("SELECT name FROM storage.objects")).rows,
  ).toHaveLength(1);
  await db.exec("RESET ROLE");
  await db.query(
    "UPDATE public.organizations SET approval='suspended' WHERE id=$1",
    [organization],
  );
  await db.exec("SET ROLE anon");
  expect(
    (await db.query("SELECT name FROM storage.objects")).rows,
  ).toHaveLength(0);
});

it("limpa uploads sem permitir reanexação e mantém a ordem das fotografias", async () => {
  await asUser(admin);
  await db.query(
    "SELECT public.set_partner_active($1,true,'Retomar após revisão')",
    [organization],
  );
  await asUser(alice);
  await db.query(
    "SELECT public.save_listing($1,$2,7,'Passeio com fotografias','Um passeio de barco com guia local e duração de três horas.','experiencias','Tofo',170000,'pessoa',false)",
    [listingId, organization],
  );
  const path = listingId + "/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg";
  await db.query(
    "INSERT INTO storage.objects(bucket_id,name) VALUES('listing-photos',$1)",
    [path],
  );
  const cleaned = await db.query(
    "SELECT * FROM public.claim_photo_cleanup($1)",
    [listingId],
  );
  expect(cleaned.rows).toEqual([{ storage_path: path }]);
  await expect(
    db.query("SELECT public.attach_listing_photo($1,$2,'Outra fotografia',8)", [
      listingId,
      path,
    ]),
  ).rejects.toThrow("scheduled for deletion");
  await db.query("SELECT public.manage_listing_photos($1,8,ARRAY[]::uuid[])", [
    listingId,
  ]);
  expect(
    (
      await db.query(
        "SELECT * FROM public.listing_photos WHERE listing_id=$1",
        [listingId],
      )
    ).rows,
  ).toHaveLength(0);
  expect(
    (
      await db.query("SELECT * FROM public.claim_photo_cleanup($1)", [
        listingId,
      ])
    ).rows,
  ).toHaveLength(2);
  await asUser(bob);
  await expect(
    db.query("SELECT * FROM public.claim_photo_cleanup($1)", [listingId]),
  ).rejects.toThrow("Manager required");
  await asUser(alice);
  await db.query("SELECT public.archive_listing($1,9)", [listingId]);
  expect(
    (
      await db.query("SELECT status FROM public.listings WHERE id=$1", [
        listingId,
      ])
    ).rows,
  ).toEqual([{ status: "archived" }]);
  await expect(
    db.query("SELECT public.set_partner_active($1,false,'Não autorizado')", [
      organization,
    ]),
  ).rejects.toThrow("Administrator required");
});

let eventId: string,
  eventSlot: string,
  eventBooking: string,
  qr: string,
  stayId: string;
it("emite bilhetes gratuitos, isola QR e rejeita entradas duplicadas", async () => {
  await asUser(alice);
  eventId = (
    await db.query<{ id: string }>(
      "SELECT public.save_listing(NULL,$1,1,'Evento de teste','Evento de teste com entradas controladas e duração limitada.','eventos','Tofo',0,'entrada',true) id",
      [organization],
    )
  ).rows[0].id;
  eventSlot = (
    await db.query<{ id: string }>(
      "SELECT public.create_ticket_category($1,'Geral',now()+interval '1 hour',now()+interval '3 hours',2,0) id",
      [eventId],
    )
  ).rows[0].id;
  await asUser(admin);
  await db.query(
    "SELECT public.review_listing($1,1,'approved','Evento verificado')",
    [eventId],
  );
  await asUser(bob);
  eventBooking = (
    await db.query<{ id: string }>(
      "SELECT public.request_reservation($1,2,'',gen_random_uuid()) id",
      [eventSlot],
    )
  ).rows[0].id;
  expect(
    (await db.query("SELECT * FROM public.notifications")).rows,
  ).toHaveLength(1);
  await asUser(alice);
  await db.query(
    "SELECT public.decide_reservation($1,'confirmed','Confirmado pelo parceiro')",
    [eventBooking],
  );
  expect((await db.query("SELECT * FROM public.tickets")).rows).toHaveLength(0);
  await asUser(bob);
  const tickets = await db.query<{ token: string }>(
    "SELECT token FROM public.tickets",
  );
  expect(tickets.rows).toHaveLength(2);
  qr = tickets.rows[0].token;
  expect(
    (await db.query("SELECT public.check_in_ticket($1) result", [qr])).rows,
  ).toEqual([{ result: "invalid" }]);
  await asUser(alice);
  expect(
    (await db.query("SELECT public.check_in_ticket($1) result", [qr])).rows,
  ).toEqual([{ result: "accepted" }]);
  expect(
    (await db.query("SELECT public.check_in_ticket($1) result", [qr])).rows,
  ).toEqual([{ result: "used" }]);
  await asUser(admin);
  await expect(
    db.query(
      "SELECT public.support_reservation($1,true,'Pedido de cancelamento')",
      [eventBooking],
    ),
  ).rejects.toThrow("Cancellation unavailable");
});
it("preços por duração, noites sobrepostas, expiração e confirmação segura", async () => {
  await asUser(alice);
  stayId = (
    await db.query<{ id: string }>(
      "SELECT public.save_listing(NULL,$1,1,'Casa de teste','Alojamento de teste com quartos e inventário por noite.','estadias','Tofo',10000,'noite',true) id",
      [organization],
    )
  ).rows[0].id;
  await db.query(
    "SELECT public.set_stay_inventory($1,current_date+2,current_date+20,1,10000,10,20)",
    [stayId],
  );
  await asUser(admin);
  await db.query(
    "SELECT public.review_listing($1,1,'approved','Alojamento verificado')",
    [stayId],
  );
  await asUser(bob);
  expect(
    (
      await db.query(
        "SELECT * FROM public.quote_stay($1,current_date+2,current_date+9)",
        [stayId],
      )
    ).rows,
  ).toEqual([{ nights: 7, remaining: 1, unit_total: 63000, discount: 10 }]);
  const key = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const request =
    "SELECT public.request_stay($1,current_date+2,current_date+9,1,'',$2,63000) id";
  const booking = (await db.query<{ id: string }>(request, [stayId, key]))
    .rows[0].id;
  expect(
    (await db.query<{ id: string }>(request, [stayId, key])).rows[0].id,
  ).toBe(booking);
  expect(
    (
      await db.query<{ remaining: number }>(
        "SELECT * FROM public.quote_stay($1,current_date+8,current_date+10)",
        [stayId],
      )
    ).rows[0].remaining,
  ).toBe(0);
  await expect(
    db.query(
      "SELECT public.request_stay($1,current_date+8,current_date+10,1,'',gen_random_uuid(),20000)",
      [stayId],
    ),
  ).rejects.toThrow("Price or availability changed");
  await asUser(alice);
  await expect(
    db.query(
      "SELECT public.set_stay_inventory($1,current_date+2,current_date+9,0,10000,0,0)",
      [stayId],
    ),
  ).rejects.toThrow("Capacity below");
  await db.exec("RESET ROLE");
  await db.query(
    "UPDATE public.reservations SET expires_at=now()-interval '1 second' WHERE id=$1",
    [booking],
  );
  await asUser(alice);
  await expect(
    db.query(
      "SELECT public.decide_reservation($1,'confirmed','Tentativa fora do prazo')",
      [booking],
    ),
  ).rejects.toThrow("Request expired");
  await asUser(bob);
  expect(
    (
      await db.query<{ remaining: number }>(
        "SELECT * FROM public.quote_stay($1,current_date+8,current_date+10)",
        [stayId],
      )
    ).rows[0].remaining,
  ).toBe(1);
});
it("proprietário gere scanner sem conceder propriedade ou administração", async () => {
  await asUser(bob);
  await expect(
    db.query("SELECT public.manage_team($1,$2,'manager')", [organization, bob]),
  ).rejects.toThrow("Approved owner required");
  await asUser(alice);
  await expect(
    db.query("SELECT public.manage_team($1,$2,'owner')", [organization, bob]),
  ).rejects.toThrow("Invalid member");
  await db.query("SELECT public.manage_team($1,$2,'scanner')", [
    organization,
    bob,
  ]);
  await asUser(bob);
  expect(
    (
      await db.query("SELECT public.is_booking_manager($1) manager", [
        organization,
      ])
    ).rows,
  ).toEqual([{ manager: false }]);
  await expect(
    db.query("SELECT public.manage_team($1,$2,'manager')", [
      organization,
      admin,
    ]),
  ).rejects.toThrow("Approved owner required");
  await asUser(alice);
  await db.query("SELECT public.manage_team($1,$2,'remove')", [
    organization,
    bob,
  ]);
});

it("confirmação paga não emite QR e a fila de emails permanece privada", async () => {
  await asUser(alice);
  const slot = (
    await db.query<{ id: string }>(
      "SELECT public.create_ticket_category($1,'VIP',now()+interval '1 hour',now()+interval '3 hours',1,10000) id",
      [eventId],
    )
  ).rows[0].id;
  await asUser(bob);
  const booking = (
    await db.query<{ id: string }>(
      "SELECT public.request_reservation($1,1,'',gen_random_uuid()) id",
      [slot],
    )
  ).rows[0].id;
  await expect(
    db.query("SELECT * FROM public.notification_email_jobs"),
  ).rejects.toThrow();
  await asUser(alice);
  await db.query(
    "SELECT public.decide_reservation($1,'confirmed','Reserva confirmada sem pagamento')",
    [booking],
  );
  await asUser(bob);
  expect(
    (
      await db.query("SELECT * FROM public.tickets WHERE reservation_id=$1", [
        booking,
      ])
    ).rows,
  ).toHaveLength(0);
  await asUser(admin);
  await db.query(
    "SELECT public.support_reservation($1,true,'Cancelamento solicitado pelo cliente')",
    [booking],
  );
  await asUser(bob);
  expect(
    (
      await db.query("SELECT status FROM public.reservations WHERE id=$1", [
        booking,
      ])
    ).rows,
  ).toEqual([{ status: "cancelled" }]);
  await db.exec("RESET ROLE");
  expect(
    (await db.query("SELECT * FROM public.notification_email_jobs")).rows
      .length,
  ).toBeGreaterThan(0);
});
